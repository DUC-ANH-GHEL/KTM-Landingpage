import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
const sql = neon(process.env.DATABASE_URL);

let _schemaEnsured = false;
let _lastAutoAdvanceAt = 0;
const AUTO_ADVANCE_TTL_MS = 10 * 60 * 1000;

let _lastDraftCleanupAt = 0;
const DRAFT_CLEANUP_TTL_MS = 10 * 60 * 1000;
const DRAFT_AUTO_DELETE_DAYS = 7;

function normalizePhone(value) {
  if (!value) return '';
  return String(value).replace(/[^0-9]/g, '');
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

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id VARCHAR(36)`;

  // Some older schemas may not have updated_at on orders
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;

  // Track when status last changed (used for automatic transitions)
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP`;

  // Helpful indexes for orders filtering (month/status/overdue)
  await sql`CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status)`;
  await sql`CREATE INDEX IF NOT EXISTS orders_status_created_at_idx ON orders(status, created_at)`;

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
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id)`;

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

  // Delete draft orders older than 7 days (best-effort; order_items should cascade)
  await sql`
    DELETE FROM orders
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
  };

  return { ...orderRow, items: [legacyItem] };
}

async function upsertCustomerByPhone({ name, phone, address }) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw new Error('Phone is required');
  }

  const existing = await sql`SELECT * FROM customers WHERE phone = ${normalizedPhone} LIMIT 1`;
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
    await ensureSchema();
    await cleanupDraftOrders();

    // ==================== CUSTOMERS ====================
    // GET /api/customers?phone=... (lookup)
    if (resource === 'customers') {
      if (req.method === 'GET') {
        const phone = normalizePhone(req.query.phone);
        if (!phone) {
          return res.status(400).json({ error: 'phone is required' });
        }

        // 1) Primary: customers table
        const rows = await sql`SELECT * FROM customers WHERE phone = ${phone} LIMIT 1`;
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
          const again = await sql`SELECT * FROM customers WHERE phone = ${phone} LIMIT 1`;
          if (again.length) return res.status(200).json({ exists: true, customer: again[0] });
          return res.status(200).json({ exists: false });
        }
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // GET /api/orders and GET /api/orders/:id
    if (req.method === 'GET') {
      await autoAdvanceOrderStatuses();
      if (id) {
        const query = `
          SELECT
            o.id,
            o.parent_order_id,
            o.split_seq,
            o.product_id,
            o.quantity,
            o.status,
            o.created_at,
            o.customer_id,
            o.adjustment_amount,
            o.adjustment_note,
            o.note,
            p0.name AS product_name,
            p0.price AS product_price,
            p0.code AS product_code,
            p0.note AS product_note,
            COALESCE(c.name, o.customer_name) AS customer_name,
            COALESCE(c.phone, o.phone) AS phone,
            COALESCE(c.address, o.address) AS address,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'product_id', oi.product_id,
                  'quantity', oi.quantity,
                  'product_name', p.name,
                  'product_price', p.price,
                  'product_code', p.code,
                  'product_note', p.note
                )
              ) FILTER (WHERE oi.id IS NOT NULL),
              '[]'::json
            ) AS items,
            COALESCE(SUM(oi.quantity) FILTER (WHERE oi.id IS NOT NULL), o.quantity, 0) AS total_quantity
          FROM orders o
          LEFT JOIN customers c ON c.id = o.customer_id
          LEFT JOIN products p0 ON p0.id = o.product_id
          LEFT JOIN order_items oi ON oi.order_id = (o.id::text)
          LEFT JOIN products p ON p.id = oi.product_id
          WHERE o.id = $1
          GROUP BY o.id, c.id, p0.id
        `;

        const rows = await sql(query, [id]);
        if (!rows.length) return res.status(404).json({ error: 'Order not found' });
        return res.status(200).json(synthesizeItemsFromLegacy(rows[0]));
      }

      const { month } = req.query;
      const overdue = String(req.query.overdue || '').trim() === '1' || String(req.query.overdue || '').trim().toLowerCase() === 'true';
      const draftExpiring = String(req.query.draftExpiring || req.query.draft_expiring || '').trim() === '1'
        || String(req.query.draftExpiring || req.query.draft_expiring || '').trim().toLowerCase() === 'true';
      const overdueDaysRaw = req.query.days ?? req.query.overdueDays ?? 3;
      let overdueDays = Number(overdueDaysRaw);
      if (!Number.isFinite(overdueDays) || overdueDays < 0) overdueDays = 3;
      overdueDays = Math.trunc(overdueDays);

      const remainingDaysRaw = req.query.remainingDays ?? req.query.remaining_days ?? 3;
      let remainingDays = Number(remainingDaysRaw);
      if (!Number.isFinite(remainingDays) || remainingDays < 0) remainingDays = 3;
      remainingDays = Math.trunc(remainingDays);
      if (remainingDays > DRAFT_AUTO_DELETE_DAYS) remainingDays = DRAFT_AUTO_DELETE_DAYS;
      const warnAgeDays = Math.max(0, DRAFT_AUTO_DELETE_DAYS - remainingDays);

      let query = `
        SELECT
          o.id,
          o.parent_order_id,
          o.split_seq,
          o.product_id,
          o.quantity,
          o.status,
          o.created_at,
          o.customer_id,
          o.adjustment_amount,
          o.adjustment_note,
          o.note,
          p0.name AS product_name,
          p0.price AS product_price,
          p0.code AS product_code,
          p0.note AS product_note,
          COALESCE(c.name, o.customer_name) AS customer_name,
          COALESCE(c.phone, o.phone) AS phone,
          COALESCE(c.address, o.address) AS address,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'product_name', p.name,
                'product_price', p.price,
                'product_code', p.code,
                'product_note', p.note
              )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::json
          ) AS items,
          COALESCE(SUM(oi.quantity) FILTER (WHERE oi.id IS NOT NULL), o.quantity, 0) AS total_quantity
        FROM orders o
        LEFT JOIN customers c ON c.id = o.customer_id
        LEFT JOIN products p0 ON p0.id = o.product_id
        LEFT JOIN order_items oi ON oi.order_id = (o.id::text)
        LEFT JOIN products p ON p.id = oi.product_id
      `;

      const params = [];
      if (draftExpiring) {
        // Draft orders that are within <= remainingDays days of auto-deletion.
        // Also limit to drafts created within the last 7 days (older drafts should be cleaned up).
        query += " WHERE o.status = 'draft' AND o.created_at IS NOT NULL";
        query += " AND o.created_at > (NOW() - ($1::int * INTERVAL '1 day'))";
        params.push(DRAFT_AUTO_DELETE_DAYS);
        if (warnAgeDays > 0) {
          query += " AND o.created_at <= (NOW() - ($2::int * INTERVAL '1 day'))";
          params.push(warnAgeDays);
        }
      } else if (overdue) {
        query += " WHERE o.status = 'pending' AND o.created_at <= (NOW() - ($1::int * INTERVAL '1 day'))";
        params.push(overdueDays);
      } else if (month) {
        query += " WHERE TO_CHAR(o.created_at, 'YYYY-MM') = $1";
        params.push(month);
      }

      query += ' GROUP BY o.id, c.id, p0.id ORDER BY o.created_at DESC';

      const result = await sql(query, params);
      return res.status(200).json(result.map(synthesizeItemsFromLegacy));
    }

    // POST /api/orders
    if (req.method === 'POST') {
      if (id) {
        return res.status(400).json({ error: 'Use /api/orders for creating orders (no id in URL)' });
      }
      const { customer_name, phone, address, product_id, quantity, status, items, adjustment_amount, adjustment_note, note, parent_order_id, split_seq } = req.body;

      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({ error: 'phone is required' });
      }

      const customer = await upsertCustomerByPhone({
        name: customer_name,
        phone: normalizedPhone,
        address,
      });

      const normalizedItems = normalizeOrderItems(items, product_id, quantity);
      if (!normalizedItems.length) {
        return res.status(400).json({ error: 'items is required' });
      }
      const primary = normalizedItems[0];

      const adj = Number(adjustment_amount);
      const adjAmount = Number.isFinite(adj) ? Math.trunc(adj) : 0;
      const adjNote = adjustment_note != null && String(adjustment_note).trim() ? String(adjustment_note).trim() : null;
      const orderNote = note != null && String(note).trim() ? String(note).trim() : null;

      let parentOrderId = parent_order_id != null && String(parent_order_id).trim() ? String(parent_order_id).trim() : null;
      let splitSeq = 0;

      // Allow creating a "root" split order (no parent) with split_seq=1
      if (!parentOrderId) {
        const seqNum = Number(split_seq);
        if (Number.isFinite(seqNum) && Math.trunc(seqNum) === 1) {
          splitSeq = 1;
        }
      }

      if (parentOrderId) {
        const parent = await sql`SELECT id, split_seq FROM orders WHERE id = ${parentOrderId} LIMIT 1`;
        if (!parent.length) {
          return res.status(400).json({ error: 'parent_order_id not found' });
        }

        // Ensure parent is marked as first split when creating children.
        await sql`
          UPDATE orders
          SET split_seq = 1
          WHERE id = ${parentOrderId} AND (split_seq IS NULL OR split_seq = 0)
        `;

        const nextSeqRows = await sql`
          SELECT (GREATEST(COALESCE(MAX(split_seq), 0), 1) + 1) AS next_seq
          FROM orders
          WHERE id = ${parentOrderId} OR parent_order_id = ${parentOrderId}
        `;
        const nextSeq = Number(nextSeqRows?.[0]?.next_seq ?? 2);
        splitSeq = Number.isFinite(nextSeq) ? Math.trunc(nextSeq) : 2;
        if (splitSeq < 2) splitSeq = 2;
      }

      const created = await sql`
        INSERT INTO orders (customer_id, parent_order_id, split_seq, product_id, quantity, status, status_updated_at, adjustment_amount, adjustment_note, note)
        VALUES (${customer.id}, ${parentOrderId}, ${splitSeq}, ${primary.product_id}, ${primary.quantity}, ${status}, NOW(), ${adjAmount}, ${adjNote}, ${orderNote})
        RETURNING id
      `;

      const orderId = created?.[0]?.id;
      if (orderId == null) return res.status(500).json({ error: 'Failed to create order' });
      const orderIdStr = String(orderId);

      for (const it of normalizedItems) {
        await sql`
          INSERT INTO order_items (id, order_id, product_id, quantity)
          VALUES (${crypto.randomUUID()}, ${orderIdStr}, ${it.product_id}, ${it.quantity})
        `;
      }

      return res.status(201).json({ success: true, id: orderId });
    }

    // PUT /api/orders/:id (or PUT /api/orders with body.id)
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Order ID is required' });

      const { customer_name, phone, address, product_id, quantity, status, items, adjustment_amount, adjustment_note, note } = req.body;
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({ error: 'phone is required' });
      }

      const currentRows = await sql`SELECT parent_order_id, split_seq, status FROM orders WHERE id = ${id} LIMIT 1`;
      if (!currentRows.length) return res.status(404).json({ error: 'Order not found' });
      const cur = currentRows[0];

      const hasParentField = Object.prototype.hasOwnProperty.call(req.body || {}, 'parent_order_id');
      const hasSplitField = Object.prototype.hasOwnProperty.call(req.body || {}, 'split_seq');

      let nextParentOrderId = cur.parent_order_id ?? null;
      if (hasParentField) {
        const raw = req.body.parent_order_id;
        nextParentOrderId = raw != null && String(raw).trim() ? String(raw).trim() : null;
      }

      let nextSplitSeq = Number(cur.split_seq ?? 0);
      if (!Number.isFinite(nextSplitSeq)) nextSplitSeq = 0;
      nextSplitSeq = Math.trunc(nextSplitSeq);
      if (hasSplitField) {
        const seqNum = Number(req.body.split_seq);
        nextSplitSeq = Number.isFinite(seqNum) ? Math.max(0, Math.trunc(seqNum)) : 0;
      }

      const customer = await upsertCustomerByPhone({
        name: customer_name,
        phone: normalizedPhone,
        address,
      });

      const normalizedItems = normalizeOrderItems(items, product_id, quantity);
      if (!normalizedItems.length) {
        return res.status(400).json({ error: 'items is required' });
      }
      const primary = normalizedItems[0];

      const adj = Number(adjustment_amount);
      const adjAmount = Number.isFinite(adj) ? Math.trunc(adj) : 0;
      const adjNote = adjustment_note != null && String(adjustment_note).trim() ? String(adjustment_note).trim() : null;
      const orderNote = note != null && String(note).trim() ? String(note).trim() : null;

      await sql`
        UPDATE orders SET
          customer_id = ${customer.id},
          parent_order_id = ${nextParentOrderId},
          split_seq = ${nextSplitSeq},
          product_id = ${primary.product_id},
          quantity = ${primary.quantity},
          status = ${status},
          status_updated_at = CASE WHEN status IS DISTINCT FROM ${status} THEN NOW() ELSE status_updated_at END,
          adjustment_amount = ${adjAmount},
          adjustment_note = ${adjNote},
          note = ${orderNote},
          updated_at = NOW()
        WHERE id = ${id}
      `;

      // Replace items
      await sql`DELETE FROM order_items WHERE order_id = ${orderIdText}`;
      for (const it of normalizedItems) {
        await sql`
          INSERT INTO order_items (id, order_id, product_id, quantity)
          VALUES (${crypto.randomUUID()}, ${orderIdText}, ${it.product_id}, ${it.quantity})
        `;
      }

      return res.status(200).json({ success: true });
    }

    // DELETE /api/orders/:id
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Order ID is required' });
      await sql`DELETE FROM order_items WHERE order_id = ${orderIdText}`;
      await sql`DELETE FROM orders WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Orders API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
