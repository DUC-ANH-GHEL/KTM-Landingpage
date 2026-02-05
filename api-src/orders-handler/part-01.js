import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
const sql = neon(process.env.DATABASE_URL);

let _schemaEnsured = false;
let _lastAutoAdvanceAt = 0;
const AUTO_ADVANCE_TTL_MS = 10 * 60 * 1000;

let _lastDraftCleanupAt = 0;
const DRAFT_CLEANUP_TTL_MS = 10 * 60 * 1000;
const DRAFT_AUTO_DELETE_DAYS = 3;

function normalizePhone(value) {
  if (!value) return '';
  return String(value).replace(/[^0-9]/g, '');
}

function parseBool(value, defaultValue = false) {
  if (value == null) return defaultValue;
  const s = String(value).trim().toLowerCase();
  if (s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'on') return true;
  if (s === '0' || s === 'false' || s === 'no' || s === 'n' || s === 'off') return false;
  return defaultValue;
}

function parseIntSafe(value, fallback = null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function parseMonthStartDate(monthKey) {
  const s = String(monthKey ?? '').trim();
  const m = s.match(/^([0-9]{4})-([0-9]{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;
  const mm = String(month).padStart(2, '0');
  return `${year}-${mm}-01`;
}

function parseMoney(value) {
  if (value == null || value === '') return 0;
  const digits = String(value).replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}

function parseShipFeeFromNote(note) {
  if (!note) return null;
  const text = String(note);
  const lower = text.toLowerCase();

  if (
    lower.includes('freeship') ||
    lower.includes('free ship') ||
    lower.includes('miễn phí ship') ||
    lower.includes('mien phi ship') ||
    lower.includes('miễn phí vận chuyển') ||
    lower.includes('mien phi van chuyen')
  ) {
    return 0;
  }

  const m = text.match(
    /(?:ship|vận\s*chuyển|van\s*chuyen|\bvc\b)\s*[:=\-]?\s*([0-9][0-9\.,\s]*)(?:\s*(k|nghìn|nghin|tr|triệu|trieu|m))?/i
  );
  if (!m) return null;

  const digits = String(m[1] || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  let fee = Number(digits);

  const unit = String(m[2] || '').toLowerCase();
  if (unit === 'k' || unit.startsWith('ngh')) fee *= 1000;
  else if (unit === 'tr' || unit.startsWith('tri') || unit === 'm') fee *= 1000000;

  return Number.isFinite(fee) ? fee : null;
}

const DEFAULT_SHIP_PERCENT = 1.64;
function normalizeShipPercent(value) {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? '').trim());
  if (!Number.isFinite(parsed)) return DEFAULT_SHIP_PERCENT;
  return Math.max(0, Math.min(100, parsed));
}

function normalizeOrderStatus(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'cancelled') return 'canceled';
  return s;
}

async function ensureSchema() {
  if (_schemaEnsured) return;

  // Customers table + add customer_id to orders
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(36) PRIMARY KEY,
      name TEXT,
      phone VARCHAR(30) UNIQUE NOT NULL,
      address TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone)`;
  // Fuzzy search indexes (ILIKE/LIKE '%...%')
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  } catch {
    // ignore if extension is not available
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS customers_name_trgm_idx ON customers USING gin (name gin_trgm_ops)`;
  } catch {
    // ignore
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS customers_phone_trgm_idx ON customers USING gin (phone gin_trgm_ops)`;
  } catch {
    // ignore
  }

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id VARCHAR(36)`;

  // Some older schemas may not have updated_at on orders
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;

  // Track when status last changed (used for automatic transitions)
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP`;

  // Helpful indexes for orders filtering (month/status/overdue)
  await sql`CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status)`;
  await sql`CREATE INDEX IF NOT EXISTS orders_status_created_at_idx ON orders(status, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS orders_status_updated_at_idx ON orders(status, status_updated_at)`;
  await sql`CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id)`;

  // Search indexes (legacy denormalized fields)
  await sql`CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders(phone)`;
  await sql`CREATE INDEX IF NOT EXISTS orders_customer_name_idx ON orders(customer_name)`;
  try {
    await sql`CREATE INDEX IF NOT EXISTS orders_phone_trgm_idx ON orders USING gin (phone gin_trgm_ops)`;
  } catch {
    // ignore
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS orders_customer_name_trgm_idx ON orders USING gin (customer_name gin_trgm_ops)`;
  } catch {
    // ignore
  }

  // Order-level adjustment (discount/surcharge)
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS adjustment_amount INTEGER DEFAULT 0`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS adjustment_note TEXT`;

  // Order-level note
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS note TEXT`;

  // Split orders (partial fulfillment)
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS parent_order_id VARCHAR(64)`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS split_seq INTEGER DEFAULT 0`;
  await sql`CREATE INDEX IF NOT EXISTS orders_parent_order_id_idx ON orders(parent_order_id)`;

  // Order items (multi-product per order)
  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id VARCHAR(36) PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL,
      product_id VARCHAR(64) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER,
      variant TEXT,
      variant_json JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id)`;
  await sql`CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON order_items(product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS order_items_created_at_idx ON order_items(created_at)`;

  // Add columns for existing deployments
  await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price INTEGER`;
  await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant TEXT`;
  await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_json JSONB`;

  // Best-effort FK cascade
  try {
    await sql`ALTER TABLE order_items
      ADD CONSTRAINT order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES orders(id)
      ON DELETE CASCADE
    `;
  } catch {
    // ignore
  }

  // Allow orders to exist without denormalized customer fields (legacy columns)
  for (const col of ['customer_name', 'phone', 'address']) {
    try {
      await sql(`ALTER TABLE orders ALTER COLUMN ${col} DROP NOT NULL`);
    } catch {
      // ignore
    }
  }

  // Best-effort FK (won't fail if not supported / already exists)
  try {
    await sql`ALTER TABLE orders
      ADD CONSTRAINT orders_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id)
      ON DELETE SET NULL
    `;
  } catch {
    // ignore
  }

  _schemaEnsured = true;
}

async function autoAdvanceOrderStatuses() {
  const now = Date.now();
  if (_lastAutoAdvanceAt && now - _lastAutoAdvanceAt < AUTO_ADVANCE_TTL_MS) return;
  _lastAutoAdvanceAt = now;

  // Pending -> Done after 20 days (based on created_at)
  // Processing -> Done after 7 days (based on status_updated_at if present, else fallback to updated_at/created_at)
  await sql`
    UPDATE orders
    SET status = 'done', status_updated_at = NOW(), updated_at = NOW()
    WHERE status = 'pending'
      AND created_at IS NOT NULL
      AND created_at <= (NOW() - INTERVAL '20 days')
  `;

  await sql`
    UPDATE orders
    SET status = 'done', status_updated_at = NOW(), updated_at = NOW()
    WHERE status = 'processing'
      AND COALESCE(status_updated_at, updated_at, created_at) IS NOT NULL
      AND COALESCE(status_updated_at, updated_at, created_at) <= (NOW() - INTERVAL '7 days')
  `;
}

async function cleanupDraftOrders() {
  const now = Date.now();
  if (_lastDraftCleanupAt && now - _lastDraftCleanupAt < DRAFT_CLEANUP_TTL_MS) return;
  _lastDraftCleanupAt = now;

  // Auto-cancel draft orders older than DRAFT_AUTO_DELETE_DAYS (best-effort; keep data for auditing)
  await sql`
    UPDATE orders
    SET
      status = 'canceled',
      status_updated_at = NOW(),
      updated_at = NOW(),
      note = (
        CASE
          WHEN COALESCE(note, '') = '' THEN 'AUTO: Đơn nháp quá hạn → chuyển sang Hủy'
          ELSE note || E'\n' || 'AUTO: Đơn nháp quá hạn → chuyển sang Hủy'
        END
      )
    WHERE status = 'draft'
      AND created_at IS NOT NULL
      AND created_at <= (NOW() - ((${DRAFT_AUTO_DELETE_DAYS}::int) * INTERVAL '1 day'))
  `;
}

function normalizeOrderItems(items, legacyProductId, legacyQuantity) {
  if (Array.isArray(items) && items.length) {
    const normalized = items
      .map((it) => ({
        product_id: it?.product_id,
        quantity: Number(it?.quantity ?? 1),
        unit_price: (() => {
          const raw = it?.unit_price ?? it?.unitPrice;
          // IMPORTANT: Number(null) === 0; treat null/empty as "not provided"
          const n = raw == null || raw === '' ? NaN : Number(raw);
          return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
        })(),
        variant: (() => {
          const v = it?.variant;
          const s = v != null ? String(v).trim() : '';
          return s ? s.slice(0, 200) : null;
        })(),
        variant_json: (() => {
          let v = it?.variant_json ?? it?.variantJson;
          if (v == null || v === '') return null;
          if (typeof v === 'string') {
            const s = v.trim();
            if (!s) return null;
            try {
              v = JSON.parse(s);
            } catch {
              return null;
            }
          }
          if (!v || typeof v !== 'object') return null;
          return v;
        })(),
      }))
      .filter((it) => it.product_id && Number.isFinite(it.quantity) && it.quantity > 0);
    if (normalized.length) return normalized;
  }

  if (legacyProductId) {
    const q = Number(legacyQuantity ?? 1);
    return [{ product_id: legacyProductId, quantity: Number.isFinite(q) && q > 0 ? q : 1 }];
  }

  return [];
}

function synthesizeItemsFromLegacy(orderRow) {
  const items = Array.isArray(orderRow.items) ? orderRow.items : [];
  if (items.length) return { ...orderRow, items };

  if (!orderRow.product_id) return { ...orderRow, items: [] };
  const q = Number(orderRow.quantity ?? 1);
  const legacyItem = {
    id: null,
    product_id: orderRow.product_id,
    quantity: Number.isFinite(q) && q > 0 ? q : 1,
    product_name: orderRow.product_name || null,
    product_price: orderRow.product_price || null,
    product_code: orderRow.product_code || null,
    product_note: orderRow.product_note || null,
    unit_price: null,
    variant: null,
    variant_json: null,
  };

  return { ...orderRow, items: [legacyItem] };
}

async function upsertCustomerByPhone({ name, phone, address }) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw new Error('Phone is required');
  }

  const existing = await sql`
    SELECT id, name, phone, address, created_at, updated_at
    FROM customers
    WHERE phone = ${normalizedPhone}
    LIMIT 1
  `;
  if (existing.length) {
    const cur = existing[0];
    const nextName = name ?? cur.name;
    const nextAddress = address ?? cur.address;

    await sql`
      UPDATE customers
      SET name = ${nextName}, address = ${nextAddress}, updated_at = NOW()
      WHERE id = ${cur.id}
    `;

    return { ...cur, name: nextName, address: nextAddress, phone: normalizedPhone };
  }

  const id = crypto.randomUUID();
  const rows = await sql`
    INSERT INTO customers (id, name, phone, address)
    VALUES (${id}, ${name || null}, ${normalizedPhone}, ${address || null})
    RETURNING *
  `;
  return rows[0];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rewrites will pass id via query (?id=...)
  const id = req.query.id || req.body?.id;
  const orderIdText = id != null ? String(id) : null;

  // Optional resource routing via rewrites (e.g. /api/customers)
  const resource = req.query.resource;

  try {
    const debug = parseBool(req.query?.debug, false);
    const t0 = debug ? Date.now() : 0;

    await ensureSchema();
    const tSchema = debug ? Date.now() : 0;

    await cleanupDraftOrders();
    const tCleanup = debug ? Date.now() : 0;

    // ==================== CUSTOMERS ====================
    // GET /api/customers?phone=... (lookup)
    if (resource === 'customers') {
      if (req.method === 'GET') {
        const phone = normalizePhone(req.query.phone);
        if (!phone) {
          return res.status(400).json({ error: 'phone is required' });
        }

        // 1) Primary: customers table
        const rows = await sql`
          SELECT id, name, phone, address, created_at, updated_at
          FROM customers
          WHERE phone = ${phone}
          LIMIT 1
        `;
        if (rows.length) return res.status(200).json({ exists: true, customer: rows[0] });

        // 2) Fallback: legacy orders data (before normalization)
        // If found, create a customers record so future lookups are fast/consistent.
        const legacy = await sql`
          SELECT
            COALESCE(o.customer_name, '') AS customer_name,
            COALESCE(o.address, '') AS address
          FROM orders o
          WHERE regexp_replace(COALESCE(o.phone, ''), '[^0-9]', '', 'g') = ${phone}
          ORDER BY o.created_at DESC
          LIMIT 1
        `;

        if (!legacy.length) return res.status(200).json({ exists: false });

        const seeded = {
          name: legacy[0].customer_name || null,
          phone,
          address: legacy[0].address || null,
        };

        try {
          const id = crypto.randomUUID();
          const inserted = await sql`
            INSERT INTO customers (id, name, phone, address)
            VALUES (${id}, ${seeded.name}, ${seeded.phone}, ${seeded.address})
            RETURNING *
          `;
          return res.status(200).json({ exists: true, customer: inserted[0] });
        } catch {
          // In case another request inserted concurrently
          const again = await sql`
            SELECT id, name, phone, address, created_at, updated_at
            FROM customers
            WHERE phone = ${phone}
            LIMIT 1
          `;
          if (again.length) return res.status(200).json({ exists: true, customer: again[0] });
          return res.status(200).json({ exists: false });
        }
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // GET /api/orders and GET /api/orders/:id
    if (req.method === 'GET') {
      let autoAdvanceMs = null;
      if (debug) {
        const t = Date.now();
        await autoAdvanceOrderStatuses();
        autoAdvanceMs = Date.now() - t;
      } else {
        await autoAdvanceOrderStatuses();
      }

      // ==================== STATS ====================
      // GET /api/orders?resource=stats&month=YYYY-MM[&ship_percent=1.64]
      if (resource === 'stats') {
        const monthKey = String(req.query.month ?? '').trim();
        const monthStartDate = parseMonthStartDate(monthKey);
        if (!monthStartDate) {
          return res.status(400).json({ error: 'month is required (YYYY-MM)' });