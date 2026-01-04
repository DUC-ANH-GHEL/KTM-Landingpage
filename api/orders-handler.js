import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rewrites will pass id via query (?id=...)
  const id = req.query.id || req.body?.id;

  try {
    // GET /api/orders and GET /api/orders/:id
    if (req.method === 'GET') {
      if (id) {
        const rows = await sql`
          SELECT o.*, p.name AS product_name
          FROM orders o
          LEFT JOIN products p ON p.id = o.product_id
          WHERE o.id = ${id}
        `;
        if (!rows.length) return res.status(404).json({ error: 'Order not found' });
        return res.status(200).json(rows[0]);
      }

      const { month } = req.query;
      let query = `
        SELECT o.*, p.name AS product_name
        FROM orders o
        LEFT JOIN products p ON p.id = o.product_id
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
      await sql`
        INSERT INTO orders (customer_name, phone, address, product_id, quantity, status)
        VALUES (${customer_name}, ${phone}, ${address}, ${product_id}, ${quantity}, ${status})
      `;
      return res.status(201).json({ success: true });
    }

    // PUT /api/orders/:id (or PUT /api/orders with body.id)
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Order ID is required' });
      const { customer_name, phone, address, product_id, quantity, status } = req.body;
      await sql`
        UPDATE orders SET
          customer_name = ${customer_name},
          phone = ${phone},
          address = ${address},
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
