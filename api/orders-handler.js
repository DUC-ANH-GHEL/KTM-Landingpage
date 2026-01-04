import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
const sql = neon(process.env.DATABASE_URL);

let _schemaEnsured = false;

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

  // Optional resource routing via rewrites (e.g. /api/customers)
  const resource = req.query.resource;

  try {
    await ensureSchema();

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
      if (id) {
        const rows = await sql`
          SELECT
            o.id,
            o.product_id,
            o.quantity,
            o.status,
            o.created_at,
            o.updated_at,
            o.customer_id,
            p.name AS product_name,
            p.price AS product_price,
            p.code AS product_code,
            COALESCE(c.name, o.customer_name) AS customer_name,
            COALESCE(c.phone, o.phone) AS phone,
            COALESCE(c.address, o.address) AS address
          FROM orders o
          LEFT JOIN products p ON p.id = o.product_id
          LEFT JOIN customers c ON c.id = o.customer_id
          WHERE o.id = ${id}
        `;
        if (!rows.length) return res.status(404).json({ error: 'Order not found' });
        return res.status(200).json(rows[0]);
      }

      const { month } = req.query;
      let query = `
        SELECT
          o.id,
          o.product_id,
          o.quantity,
          o.status,
          o.created_at,
          o.updated_at,
          o.customer_id,
          p.name AS product_name,
          p.price AS product_price,
          p.code AS product_code,
          COALESCE(c.name, o.customer_name) AS customer_name,
          COALESCE(c.phone, o.phone) AS phone,
          COALESCE(c.address, o.address) AS address
        FROM orders o
        LEFT JOIN products p ON p.id = o.product_id
        LEFT JOIN customers c ON c.id = o.customer_id
      `;
      const params = [];
      if (month) {
        query += " WHERE TO_CHAR(o.created_at, 'YYYY-MM') = $1";
        params.push(month);
      }
      query += ' ORDER BY o.created_at DESC';

      const result = await sql(query, params);
      return res.status(200).json(result);
    }

    // POST /api/orders
    if (req.method === 'POST') {
      if (id) {
        return res.status(400).json({ error: 'Use /api/orders for creating orders (no id in URL)' });
      }
      const { customer_name, phone, address, product_id, quantity, status } = req.body;

      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({ error: 'phone is required' });
      }

      const customer = await upsertCustomerByPhone({
        name: customer_name,
        phone: normalizedPhone,
        address,
      });

      await sql`
        INSERT INTO orders (customer_id, product_id, quantity, status)
        VALUES (${customer.id}, ${product_id}, ${quantity}, ${status})
      `;
      return res.status(201).json({ success: true });
    }

    // PUT /api/orders/:id (or PUT /api/orders with body.id)
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Order ID is required' });

      const { customer_name, phone, address, product_id, quantity, status } = req.body;
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({ error: 'phone is required' });
      }

      const customer = await upsertCustomerByPhone({
        name: customer_name,
        phone: normalizedPhone,
        address,
      });

      await sql`
        UPDATE orders SET
          customer_id = ${customer.id},
          product_id = ${product_id},
          quantity = ${quantity},
          status = ${status}
        WHERE id = ${id}
      `;
      return res.status(200).json({ success: true });
    }

    // DELETE /api/orders/:id
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Order ID is required' });
      await sql`DELETE FROM orders WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Orders API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
