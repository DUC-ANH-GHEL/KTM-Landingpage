// api/albums.js - Vercel Serverless Function for Albums API
import { Pool } from 'pg';

// Tạo connection pool
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

  // GET /api/albums - Lấy danh sách albums
  if (req.method === 'GET') {
    try {
      const q = `
        SELECT a.id, a.slug, a.title, a.description, a.cover_url,
               (SELECT COUNT(*) FROM images i WHERE i.album_id = a.id)::int as image_count
        FROM albums a
        ORDER BY a.created_at DESC;
      `;
      const { rows } = await pool.query(q);
      
      // Transform to match frontend format
      const albums = rows.map(row => ({
        id: row.slug || row.id,
        title: row.title,
        description: row.description,
        cover: row.cover_url,
        count: row.image_count,
        images: []
      }));
      
      return res.status(200).json(albums);
    } catch (err) {
      console.error('GET /api/albums error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  // POST /api/albums - Tạo album mới
  if (req.method === 'POST') {
    try {
      const { slug, title, description, cover_url } = req.body || {};
      
      if (!slug || !title) {
        return res.status(400).json({ error: 'slug and title are required' });
      }
      
      const q = `
        INSERT INTO albums (slug, title, description, cover_url) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `;
      const { rows } = await pool.query(q, [slug, title, description || null, cover_url || null]);
      return res.status(201).json(rows[0]);
    } catch (err) {
      console.error('POST /api/albums error:', err);
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Album slug already exists' });
      }
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
