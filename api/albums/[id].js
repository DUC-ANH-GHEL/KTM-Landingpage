// api/albums/[id].js - Vercel Serverless Function for single Album
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }

  const sql = neon(process.env.DATABASE_URL);
  const { id } = req.query; // album id or slug

  // GET /api/albums/[id] - Lấy album với tất cả ảnh
  if (req.method === 'GET') {
    try {
      // Tìm album theo uuid hoặc slug
      const albumRows = await sql`
        SELECT * FROM albums 
        WHERE id::text = ${id} OR slug = ${id} 
        LIMIT 1
      `;
      
      if (albumRows.length === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }

      const album = albumRows[0];
      
      // Lấy tất cả ảnh của album
      const imageRows = await sql`
        SELECT id, url, caption, sort_order, metadata 
        FROM images 
        WHERE album_id = ${album.id} 
        ORDER BY sort_order, created_at
      `;

      // Transform to match frontend format
      const result = {
        id: album.slug || album.id,
        title: album.title,
        description: album.description,
        cover: album.cover_url,
        count: imageRows.length,
        images: imageRows.map(img => ({
          id: img.id,
          src: img.url,
          caption: img.caption || ''
        }))
      };
      
      return res.status(200).json(result);
    } catch (err) {
      console.error('GET /api/albums/[id] error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  // POST /api/albums/[id]/images - Thêm ảnh vào album
  if (req.method === 'POST') {
    try {
      const { url, caption, sort_order } = req.body || {};
      
      if (!url) {
        return res.status(400).json({ error: 'url is required' });
      }
      
      // Tìm album_id từ slug hoặc uuid
      const albumRows = await sql`SELECT id FROM albums WHERE id::text = ${id} OR slug = ${id} LIMIT 1`;
      
      if (albumRows.length === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }
      
      const albumId = albumRows[0].id;
      
      const rows = await sql`
        INSERT INTO images (album_id, url, caption, sort_order) 
        VALUES (${albumId}, ${url}, ${caption || null}, ${sort_order || 0}) 
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    } catch (err) {
      console.error('POST /api/albums/[id]/images error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  // DELETE /api/albums/[id] - Xóa album
  if (req.method === 'DELETE') {
    try {
      const rows = await sql`DELETE FROM albums WHERE id::text = ${id} OR slug = ${id} RETURNING *`;
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }
      
      return res.status(200).json({ message: 'Album deleted', album: rows[0] });
    } catch (err) {
      console.error('DELETE /api/albums/[id] error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
