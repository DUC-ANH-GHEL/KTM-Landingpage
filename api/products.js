import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Lấy danh sách sản phẩm
    if (req.method === 'GET') {
      const { id, category } = req.query;
      
      if (id) {
        // Lấy 1 sản phẩm theo ID
        const result = await sql`SELECT * FROM products WHERE id = ${id}`;
        if (result.length === 0) {
          return res.status(404).json({ error: 'Product not found' });
        }
        return res.status(200).json(result[0]);
      }
      
      if (category) {
        // Lấy theo category
        const products = await sql`SELECT * FROM products WHERE category = ${category} ORDER BY sort_order ASC, created_at DESC`;
        return res.status(200).json(products);
      }
      
      // Lấy tất cả
      const products = await sql`SELECT * FROM products ORDER BY sort_order ASC, created_at DESC`;
      return res.status(200).json(products);
    }

    // POST - Tạo sản phẩm mới
    if (req.method === 'POST') {
      const { id, name, code, price, image, category, note, sort_order } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Generate ID if not provided
      const productId = id || `prod-${Date.now()}`;
      
      const result = await sql`
        INSERT INTO products (id, name, code, price, image, category, note, sort_order)
        VALUES (${productId}, ${name}, ${code || null}, ${price || null}, ${image || null}, ${category || null}, ${note || null}, ${sort_order || 0})
        RETURNING *
      `;

      return res.status(201).json(result[0]);
    }

    // PUT - Cập nhật sản phẩm
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { name, code, price, image, category, note, sort_order } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      const result = await sql`
        UPDATE products 
        SET 
          name = COALESCE(${name}, name),
          code = COALESCE(${code}, code),
          price = COALESCE(${price}, price),
          image = COALESCE(${image}, image),
          category = COALESCE(${category}, category),
          note = COALESCE(${note}, note),
          sort_order = COALESCE(${sort_order}, sort_order),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json(result[0]);
    }

    // DELETE - Xóa sản phẩm
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING *`;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json({ message: 'Product deleted', product: result[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Products API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
