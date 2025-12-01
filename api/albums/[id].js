// api/albums/[id].js - Vercel Serverless Function for single Album
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query; // album id or slug

  // GET /api/albums/[id] - Lấy album với tất cả ảnh
  if (req.method === 'GET') {
    try {
      // Tìm album theo uuid hoặc slug
      const albumQ = `
        SELECT * FROM albums 
        WHERE id::text = $1 OR slug = $1 
        LIMIT 1
      `;
      const albumRes = await pool.query(albumQ, [id]);
      
      if (albumRes.rowCount === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }

      const album = albumRes.rows[0];
      
      // Lấy tất cả ảnh của album
      const imagesQ = `
        SELECT id, url, caption, sort_order, metadata 
        FROM images 
        WHERE album_id = $1 
        ORDER BY sort_order, created_at
      `;
      const imagesRes = await pool.query(imagesQ, [album.id]);

      // Transform to match frontend format
      const result = {
        id: album.slug || album.id,
        title: album.title,
        description: album.description,
        cover: album.cover_url,
        count: imagesRes.rowCount,
        images: imagesRes.rows.map(img => ({
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

  // POST /api/albums/[id]/images - Thêm ảnh vào album (cần check path)
  if (req.method === 'POST') {
    try {
      const { url, caption, sort_order } = req.body || {};
      
      if (!url) {
        return res.status(400).json({ error: 'url is required' });
      }
      
      // Tìm album_id từ slug hoặc uuid
      const albumQ = `SELECT id FROM albums WHERE id::text = $1 OR slug = $1 LIMIT 1`;
      const albumRes = await pool.query(albumQ, [id]);
      
      if (albumRes.rowCount === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }
      
      const albumId = albumRes.rows[0].id;
      
      const q = `
        INSERT INTO images (album_id, url, caption, sort_order) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `;
      const { rows } = await pool.query(q, [albumId, url, caption || null, sort_order || 0]);
      return res.status(201).json(rows[0]);
    } catch (err) {
      console.error('POST /api/albums/[id]/images error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  // DELETE /api/albums/[id] - Xóa album
  if (req.method === 'DELETE') {
    try {
      const q = `DELETE FROM albums WHERE id::text = $1 OR slug = $1 RETURNING *`;
      const { rows, rowCount } = await pool.query(q, [id]);
      
      if (rowCount === 0) {
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
