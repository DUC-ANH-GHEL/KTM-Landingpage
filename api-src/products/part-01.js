import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

let _sql = null;
function getSql() {
  if (!process.env.DATABASE_URL) return null;
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

let _productsSchemaEnsured = false;
let _productsSchemaPromise = null;

let _settingsSchemaEnsured = false;
let _settingsSchemaPromise = null;

const DEFAULT_SHIP_PERCENT = 1.64;

function normalizeShipPercent(value) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').trim());
  if (!Number.isFinite(n)) return DEFAULT_SHIP_PERCENT;
  return Math.max(0, Math.min(100, n));
}

function normalizeCommissionPercent(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  // Clamp to [0, 100]
  return Math.max(0, Math.min(100, n));
}

function normalizeAttributes(value) {
  if (value == null || value === '') return null;

  let v = value;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    try {
      v = JSON.parse(s);
    } catch {
      return null;
    }
  }

  // Support object map: { "Cân nặng": "10kg" }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    v = Object.entries(v).map(([k, val]) => ({ key: k, value: val }));
  }

  if (!Array.isArray(v)) return null;

  const attrs = v
    .map((a) => {
      if (!a || typeof a !== 'object') return null;
      const key = String(a.key ?? a.name ?? a.label ?? '').trim();
      const valueText = a.value ?? a.val ?? a.text ?? '';
      const valueStr = String(valueText ?? '').trim();
      const unit = String(a.unit ?? '').trim();
      if (!key) return null;
      if (!valueStr && !unit) return { key };
      return unit ? { key, value: valueStr, unit } : { key, value: valueStr };
    })
    .filter(Boolean);

  return attrs.length ? attrs : null;
}

function parseVndToInt(value) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function normalizeVariants(value, basePriceText) {
  if (value == null || value === '') return null;

  let v = value;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    try {
      v = JSON.parse(s);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(v)) return null;

  const base = parseVndToInt(basePriceText);

  const groups = v
    .map((g) => {
      if (!g || typeof g !== 'object') return null;
      const name = String(g.name ?? '').trim();
      const optionsRaw = Array.isArray(g.options) ? g.options : [];
      const options = optionsRaw
        .map((opt) => {
          if (!opt || typeof opt !== 'object') return null;
          const label = String(opt.label ?? '').trim();
          if (!label) return null;

          const priceRaw = opt.price ?? opt.priceValue ?? opt.unit_price ?? opt.unitPrice ?? null;
          const priceNum = Number(priceRaw);
          const absPrice = Number.isFinite(priceNum) ? Math.max(0, Math.trunc(priceNum)) : null;

          const deltaRaw = opt.price_delta ?? opt.priceDelta ?? null;
          const deltaNum = Number(deltaRaw);
          const price_delta = Number.isFinite(deltaNum) ? Math.trunc(deltaNum) : 0;

          // Prefer absolute price; if missing and we have base, derive from delta
          if (absPrice != null) return { label, price: absPrice };
          if (base != null) return { label, price: Math.max(0, Math.trunc(base + price_delta)) };

          // Fallback: keep legacy delta when base is unknown
          return { label, price_delta };
        })
        .filter(Boolean);

      if (!name && options.length === 0) return null;
      return { name: name || 'Biến thể', options };
    })
    .filter(Boolean);

  return groups.length ? groups : null;
}

async function ensureProductsSchema() {
  const sql = getSql();
  if (!sql) throw new Error('DATABASE_URL not configured');

  // Create table if missing (includes new column)
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(500) NOT NULL,
      code VARCHAR(50),
      price VARCHAR(50),
      image TEXT,
      category VARCHAR(100),
      note TEXT,
      sort_order INTEGER DEFAULT 0,
      commission_percent NUMERIC(6,2) DEFAULT 5,
      variants JSONB,
      attributes JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Add column for existing deployments
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(6,2) DEFAULT 5`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes JSONB`;

  // Helpful indexes for common list queries
  await sql`CREATE INDEX IF NOT EXISTS products_sort_order_created_at_idx ON products(sort_order ASC, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS products_category_sort_order_created_at_idx ON products(category, sort_order ASC, created_at DESC)`;
}

async function ensureProductsSchemaOnce() {
  if (_productsSchemaEnsured) return;
  if (!_productsSchemaPromise) {
    _productsSchemaPromise = ensureProductsSchema()
      .then(() => {
        _productsSchemaEnsured = true;
      })
      .catch((err) => {
        _productsSchemaPromise = null;
        throw err;
      });
  }
  return _productsSchemaPromise;
}

async function ensureSettingsSchema() {
  const sql = getSql();
  if (!sql) throw new Error('DATABASE_URL not configured');

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

async function ensureSettingsSchemaOnce() {
  if (_settingsSchemaEnsured) return;
  if (!_settingsSchemaPromise) {
    _settingsSchemaPromise = ensureSettingsSchema()
      .then(() => {
        _settingsSchemaEnsured = true;
      })
      .catch((err) => {
        _settingsSchemaPromise = null;
        throw err;
      });
  }
  return _settingsSchemaPromise;
}

// Initial products data for migration
const INITIAL_PRODUCTS = [
  { id: 'xylanh-giua', name: 'Xy lanh giữa', price: '1.950.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538306/2_sxq2wa.jpg', category: 'Ty xy lanh', note: 'Thêm dây là 2.150.000đ' },
  { id: 'xylanh-nghieng', name: 'Xy lanh nghiêng', price: '1.950.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538307/3_nxbqyo.jpg', category: 'Ty xy lanh', note: 'Thêm dây là 2.150.000đ' },
  { id: 'xylanh-ui', name: 'Xy lanh ủi', price: '2.200.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538307/4_rj8cv2.jpg', category: 'Ty xy lanh' },
  { id: 'combo-van1-2', name: 'Combo Van 1 tay + 1 xylanh nghiêng/giữa', price: '4.750.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1751807509/74.1_Combo_1_tay_xylanh_nghi%C3%AAng_thbmua.jpg', category: 'Combo Van 1 tay' },
  { id: 'combo-van1-3', name: 'Combo Van 1 tay + 1 xylanh nghiêng/giữa', price: '4.750.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762522/COMBO_VAN_1_TAY_1_TY_GI%E1%BB%AEA_KTM_ulsy1c.jpg', category: 'Combo Van 1 tay' },
  { id: 'combo-van1-1', name: 'Combo Van 1 tay + 1 xylanh ủi', price: '5.000.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1751807509/74_combo_van_1_tay_1_xylanh_%E1%BB%A7i_gvf1t1.jpg', category: 'Combo Van 1 tay' },
  { id: 'combo-van2-3', name: 'Combo van 2 tay 2 ty nghiêng giữa KTM', price: '7.300.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762120/combo_van_2_tay_2_ty_nghi%C3%AAng_gi%E1%BB%AFa_KTM_bwpf3o.jpg', category: 'Combo Van 2 tay' },
  { id: 'combo-van2-1', name: 'Combo van 2 tay 1 ty nghiêng ktm', price: '5.080.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762121/combo_van_2_tay_1_ty_nghi%C3%AAng_ktm_eumive.jpg', category: 'Combo Van 2 tay' },
  { id: 'combo-van2-2', name: 'Combo van 2 tay 1 ty giữa ktm', price: '5.080.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762402/combo_van_2_tay_1_ty_gi%E1%BB%AFa_KTM_e6ssao.jpg', category: 'Combo Van 2 tay' },
  { id: 'combo-van3-1', name: 'Combo Van 3 tay + 1 xylanh giữa', price: '5.550.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749300157/Combo_van_3_tay_xylanh_gi%E1%BB%AFa_mxdsth.jpg', category: 'Combo Van 3 tay' },
  { id: 'combo-van3-2', name: 'Combo Van 3 tay + 3 xylanh', price: '10.250.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749300461/combo_van_3_tay_3_xylanh_nghi%C3%AAng_gi%E1%BB%AFa_%E1%BB%A7i_mgppxh.jpg', category: 'Combo Van 3 tay' },
  { id: 'combo-van3-3', name: 'Combo Van 3 tay + 2 xylanh', price: '7.800.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749300324/Combo_Van_3_tay_2_xylanh_nghi%C3%AAng_gi%E1%BB%AFa_evihrt.jpg', category: 'Combo Van 3 tay' },
  { id: 'combo-van4-1', name: 'Combo Van 4 tay + 2 xylanh', price: '8.300.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749135217/Combo_van_4_tay_1_xylanh_nghi%C3%AAng_1_xylanh_gi%E1%BB%AFa_nh6gjh.jpg', category: 'Combo Van 4 tay' },
  { id: 'combo-van4-2', name: 'Combo van 4 tay 1 ty giữa ktm', price: '6.050.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762675/combo_van_4_tay_1_ty_gi%E1%BB%AFa_ktm_auo6xo.jpg', category: 'Combo Van 4 tay' },
  { id: 'combo-van4-3', name: 'Combo van 4 tay 1 ty nghiêng ktm', price: '6.050.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762677/combo_van_4_tay_1_ty_nghi%C3%AAng_ktm_eyk6fr.jpg', category: 'Combo Van 4 tay' },
  { id: 'combo-van5-1', name: 'Combo Van 5 tay + 2 xylanh', price: '8.800.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747537715/Combo_van_5_tay_2_xylanh_1_nghi%C3%AAng_1_gi%E1%BB%AFa_KTM_htd1au.jpg', category: 'Combo Van 5 tay' },
  { id: 'combo-van5-2', name: 'Combo Van 5 tay + 1 xylanh', price: '6.550.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747539250/Combo_van_5_tay_1_xylanh_nghi%C3%AAng_KTM_kv6irg.jpg', category: 'Combo Van 5 tay' },
  { id: 'combo-van5-3', name: 'Combo Van 5 tay + 1 xylanh', price: '6.550.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762831/combo_van_5_tay_1_ty_gi%E1%BB%AFa_KTM_l74ame.jpg', category: 'Combo Van 5 tay' },
  { id: 'trang-62', name: 'Trang Trượt van 4 tay KTM 4 xylanh Lắp trên xới', code: 'KTM-62', price: '21.200.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749135668/trang_g%E1%BA%A1t_wleewb.jpg', category: 'Trang gạt' },
  { id: 'trang-63', name: 'Trang Gập Van tay KTM 4 xylanh Lắp trên xới', code: 'KTM-63', price: '23.200.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749135668/trang_g%E1%BA%A1t_wleewb.jpg', category: 'Trang gạt' },
  { id: 'spare-1', name: 'Bộ nối nhanh', code: 'SP-01', price: '400.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760870151/9-1_n%E1%BB%91i_nhanh_KTM_gsouip.jpg', category: 'Phụ kiện' },
  { id: 'spare-2', name: 'Van chống tụt hình vuông', code: 'SP-02', price: '630.000đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760870364/24_Van_ch%E1%BB%91ng_t%E1%BB%A5t_lo%E1%BA%A1i_vu%C3%B4ng_KTM_sdnjcd.jpg', category: 'Phụ kiện' },
  { id: 'mat-bich', name: 'Mặt bích', price: '550.000 đ', category: 'Phụ kiện', note: 'có freeship' },
  { id: 'nhot-5l', name: 'Nhớt động cơ 5L', price: '590.000 đ', category: 'Phụ kiện', note: 'có freeship' },
  { id: 'nhot-20l', name: 'Nhớt động cơ 20L', price: '2.140.000 đ', category: 'Phụ kiện', note: 'có freeship' },
  { id: 'van-1', name: 'Van 1 tay', code: 'V-01', price: '1.900.000 đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/van1_sjzm7p.png', category: 'Van điều khiển' },
  { id: 'van-2', name: 'Van 2 tay', code: 'V-02', price: '2.200.000 đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/van2_hogp0r.png', category: 'Van điều khiển' },
  { id: 'van-3', name: 'Van 3 tay', code: 'V-03', price: '2.700.000 đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/van3_qettd5.png', category: 'Van điều khiển' },
  { id: 'van-4', name: 'Van 4 tay', code: 'V-04', price: '3.200.000 đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538311/van4_bxu8ry.png', category: 'Van điều khiển' },
  { id: 'van-5', name: 'Van 5 tay', code: 'V-05', price: '3.600.000 đ', image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/van5_pjllmw.png', category: 'Van điều khiển' },
  { id: 'van-6', name: 'Van 6 tay', code: 'V-06', price: '4.100.000 đ', image: 'https://img.icons8.com/color/48/settings.png', category: 'Van điều khiển' }
];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getSql();
  if (!sql) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }

  try {
    const debug = String(req.query?.debug ?? '') === '1';
    const withMeta = String(req.query?.meta ?? '') === '1';
    const t0 = debug ? Date.now() : 0;

    // Cache (GET only). Allow bypass via nocache=1 or debug=1.
    if (req.method === 'GET') {
      const noCache = String(req.query?.nocache ?? req.query?.noCache ?? '').trim() === '1'
        || String(req.query?.debug ?? '').trim() === '1'
        || String(req.query?.__settings ?? '').trim() === '1';
      if (noCache) {
        res.setHeader('Cache-Control', 'no-store');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400');
      }
    }

    const fields = String(req.query?.fields ?? req.query?.select ?? '').trim().toLowerCase();
    const fieldsMode = fields || (String(req.query?.lite ?? '') === '1' ? 'lite' : '');

    const selectColumnsForMode = (mode) => {
      // IMPORTANT: Only use whitelisted columns to avoid SQL injection.
      if (mode === 'min') {
        return 'id, name, code, price';
      }
      if (mode === 'ai') {
        // Used by AI chat widget: needs basic info + optional image.
        return 'id, name, code, price, image, category, note';
      }
      if (mode === 'search') {
        // Used by admin global search: needs image preview.
        return 'id, name, code, price, image, category, note, sort_order';
      }
      if (mode === 'order' || mode === 'lite') {
        // Used by order entry/statistics: needs note/variants/commission.
        return 'id, name, code, price, image, category, note, sort_order, commission_percent, variants';
      }
      return '*';
    };

    // Settings passthrough (Vercel rewrite: /api/settings -> /api/products?__settings=1)
    if (req.query && String(req.query.__settings ?? '') === '1') {
      await ensureSettingsSchemaOnce();

      if (req.method === 'GET') {
        const rows = await sql`SELECT value FROM settings WHERE key = ${'ship_percent'} LIMIT 1`;
        const shipPercent = rows.length
          ? normalizeShipPercent(rows[0]?.value)
          : DEFAULT_SHIP_PERCENT;
        if (withMeta) {
          return res.status(200).json({
            ship_percent: shipPercent,
            meta: debug ? { timingsMs: { total: Date.now() - t0 } } : undefined,
          });
        }
        return res.status(200).json({ ship_percent: shipPercent });
      }

      if (req.method === 'PUT') {
        const shipPercent = normalizeShipPercent(req.body?.ship_percent ?? req.body?.shipPercent);
        await sql`
          INSERT INTO settings (key, value, updated_at)
          VALUES (${ 'ship_percent' }, ${ String(shipPercent) }, NOW())
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW()
        `;
        if (withMeta) {
          return res.status(200).json({
            ship_percent: shipPercent,
            meta: debug ? { timingsMs: { total: Date.now() - t0 } } : undefined,
          });
        }
        return res.status(200).json({ ship_percent: shipPercent });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    await ensureProductsSchemaOnce();
    const tSchema = debug ? Date.now() : 0;

    // POST với action delete-image - Xóa ảnh Cloudinary
    if (req.method === 'POST' && req.query.action === 'delete-image') {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: 'URL is required' });
      const result = await deleteCloudinaryImage(url);
      return res.status(200).json(result);
    }

    // GET - Lấy danh sách sản phẩm
    if (req.method === 'GET') {
      const { id, category, action } = req.query;
      
      // Action: init - tạo table và migrate data
      if (action === 'init') {
        // Ensure schema (idempotent)
        await ensureProductsSchema();
        
        let inserted = 0;
        for (let i = 0; i < INITIAL_PRODUCTS.length; i++) {
          const p = INITIAL_PRODUCTS[i];
          try {
            await sql`
              INSERT INTO products (id, name, code, price, image, category, note, sort_order, commission_percent, attributes)
              VALUES (${p.id}, ${p.name}, ${p.code || null}, ${p.price || null}, ${p.image || null}, ${p.category || null}, ${p.note || null}, ${i}, ${5}, ${null}::jsonb)
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, code = EXCLUDED.code, price = EXCLUDED.price,
                image = EXCLUDED.image, category = EXCLUDED.category, note = EXCLUDED.note,
                sort_order = EXCLUDED.sort_order,
                commission_percent = COALESCE(products.commission_percent, EXCLUDED.commission_percent),
                updated_at = NOW()
            `;
            inserted++;
          } catch (e) { console.error(e); }
        }
        
        const count = await sql`SELECT COUNT(*) as total FROM products`;
        return res.status(200).json({ success: true, inserted, total: count[0].total });
      }
      
      // Action: migrate-nested-folders - Thêm parent_id cho albums và video_folders
      if (action === 'migrate-nested-folders') {
        try {
          // Add parent_id column to albums if not exists
          await sql`
            ALTER TABLE albums ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES albums(id) ON DELETE CASCADE
          `;
          
          // Add parent_id column to video_folders if not exists
          await sql`
            ALTER TABLE video_folders ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES video_folders(id) ON DELETE CASCADE
          `;
          
          return res.status(200).json({ 
            success: true, 
            message: 'Added parent_id column to albums and video_folders tables'
          });
        } catch (err) {
          console.error('Migration error:', err);
          return res.status(500).json({ error: err.message });
        }
      }
      
      if (id) {
        const cols = selectColumnsForMode(fieldsMode);
        const q = cols === '*'
          ? 'SELECT * FROM products WHERE id = $1'
          : `SELECT ${cols} FROM products WHERE id = $1`;
        const result = await sql(q, [id]);
        if (result.length === 0) return res.status(404).json({ error: 'Product not found' });
        if (withMeta) {
          return res.status(200).json({
            data: result[0],
            meta: debug ? { timingsMs: { schema: tSchema - t0, total: Date.now() - t0 } } : undefined,
          });
        }
        return res.status(200).json(result[0]);
      }
      
      if (category) {
        const cols = selectColumnsForMode(fieldsMode);
        const q = cols === '*'
          ? 'SELECT * FROM products WHERE category = $1 ORDER BY sort_order ASC, created_at DESC'
          : `SELECT ${cols} FROM products WHERE category = $1 ORDER BY sort_order ASC, created_at DESC`;
        const products = await sql(q, [category]);
        if (withMeta) {
          return res.status(200).json({
            data: products,
            meta: debug ? { timingsMs: { schema: tSchema - t0, total: Date.now() - t0 } } : undefined,
          });
        }
        return res.status(200).json(products);
      }
      
      const cols = selectColumnsForMode(fieldsMode);
      const q = cols === '*'
        ? 'SELECT * FROM products ORDER BY sort_order ASC, created_at DESC'
        : `SELECT ${cols} FROM products ORDER BY sort_order ASC, created_at DESC`;
      const products = await sql(q);
      if (withMeta) {
        return res.status(200).json({
          data: products,
          meta: debug ? { timingsMs: { schema: tSchema - t0, total: Date.now() - t0 } } : undefined,
        });
      }
      return res.status(200).json(products);
    }

    // POST - Tạo sản phẩm mới
    if (req.method === 'POST') {
      const { id, name, code, price, image, category, note, sort_order, commission_percent, variants, attributes } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Generate ID if not provided
      const productId = id || `prod-${Date.now()}`;

      const commission = normalizeCommissionPercent(commission_percent);
      const normalizedVariants = normalizeVariants(variants, price);
      const variantsJson = normalizedVariants != null ? JSON.stringify(normalizedVariants) : null;

      const normalizedAttributes = normalizeAttributes(attributes);
      const attributesJson = normalizedAttributes != null ? JSON.stringify(normalizedAttributes) : null;
      
      const result = await sql`
        INSERT INTO products (id, name, code, price, image, category, note, sort_order, commission_percent, variants, attributes)
        VALUES (
          ${productId},
          ${name},
          ${code || null},
          ${price || null},
          ${image || null},
          ${category || null},
          ${note || null},
          ${sort_order || 0},
          COALESCE(${commission}, 5),
          ${variantsJson}::jsonb,
          ${attributesJson}::jsonb
        )
        RETURNING *
      `;