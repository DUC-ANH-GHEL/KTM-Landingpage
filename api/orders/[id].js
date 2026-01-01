import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Order ID is required' });

  try {
    // GET /api/orders/[id]
    if (req.method === 'GET') {
      const result = await sql`SELECT o.*, p.name AS product_name FROM orders o LEFT JOIN products p ON p.id = o.product_id WHERE o.id = ${id}`;
      if (!result.length) return res.status(404).json({ error: 'Order not found' });
      return res.status(200).json(result[0]);
    }

    // PUT /api/orders/[id]
    if (req.method === 'PUT') {
      const { customer_name, phone, address, product_id, quantity, status } = req.body;
      await sql`
        UPDATE orders SET 
        customer_name=${customer_name}, phone=${phone}, address=${address}, product_id=${product_id}, quantity=${quantity}, status=${status}
        WHERE id=${id}
      `;
      return res.status(200).json({ success: true });
    }

    // DELETE /api/orders/[id]
    if (req.method === 'DELETE') {
      await sql`DELETE FROM orders WHERE id=${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Orders API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
