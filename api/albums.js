// api/albums.js - Vercel Serverless Function for Albums API
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

  // Create SQL client
  const sql = neon(process.env.DATABASE_URL);

  // GET /api/albums - Lấy danh sách albums
  if (req.method === 'GET') {
    try {
      const { parent_id } = req.query;
      
      let rows;
      if (parent_id === 'root' || parent_id === '') {
        // Get root level albums (no parent)
        rows = await sql`
          SELECT a.id, a.slug, a.title, a.description, a.cover_url, a.parent_id,
                 (SELECT COUNT(*) FROM images i WHERE i.album_id = a.id)::int as image_count,
                 (SELECT COUNT(*) FROM albums sub WHERE sub.parent_id = a.id)::int as subfolder_count
          FROM albums a
          WHERE a.parent_id IS NULL
          ORDER BY a.created_at DESC
        `;
      } else if (parent_id) {
        // Get albums in specific parent
        rows = await sql`
          SELECT a.id, a.slug, a.title, a.description, a.cover_url, a.parent_id,
                 (SELECT COUNT(*) FROM images i WHERE i.album_id = a.id)::int as image_count,
                 (SELECT COUNT(*) FROM albums sub WHERE sub.parent_id = a.id)::int as subfolder_count
          FROM albums a
          WHERE a.parent_id = ${parent_id}::uuid
          ORDER BY a.created_at DESC
        `;
      } else {
        // Get all albums (for backward compatibility)
        rows = await sql`
          SELECT a.id, a.slug, a.title, a.description, a.cover_url, a.parent_id,
                 (SELECT COUNT(*) FROM images i WHERE i.album_id = a.id)::int as image_count,
                 (SELECT COUNT(*) FROM albums sub WHERE sub.parent_id = a.id)::int as subfolder_count
          FROM albums a
          ORDER BY a.created_at DESC
        `;
      }
      
      // Transform to match frontend format
      const albums = rows.map(row => ({
        id: row.slug || row.id,
        uuid: row.id,
        title: row.title,
        description: row.description,
        cover: row.cover_url,
        count: row.image_count,
        subfolderCount: row.subfolder_count,
        parentId: row.parent_id,
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
      const { slug, title, description, cover_url, parent_id } = req.body || {};
      
      if (!slug || !title) {
        return res.status(400).json({ error: 'slug and title are required' });
      }
      
      const rows = await sql`
        INSERT INTO albums (slug, title, description, cover_url, parent_id) 
        VALUES (${slug}, ${title}, ${description || null}, ${cover_url || null}, ${parent_id || null}) 
        RETURNING *
      `;
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
