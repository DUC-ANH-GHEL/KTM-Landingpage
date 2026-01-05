import { neon } from '@neondatabase/serverless';

const DEFAULT_SHIP_PERCENT = 1.64;

function normalizeShipPercent(value) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').trim());
  if (!Number.isFinite(n)) return DEFAULT_SHIP_PERCENT;
  return Math.max(0, Math.min(100, n));
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }

  const sql = neon(process.env.DATABASE_URL);

  async function ensureSettingsSchema() {
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
  }

  try {
    await ensureSettingsSchema();

    if (req.method === 'GET') {
      const rows = await sql`SELECT value FROM settings WHERE key = ${'ship_percent'} LIMIT 1`;
      const shipPercent = rows.length
        ? normalizeShipPercent(rows[0]?.value)
        : DEFAULT_SHIP_PERCENT;

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

      return res.status(200).json({ ship_percent: shipPercent });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Settings API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
