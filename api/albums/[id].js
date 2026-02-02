// api/albums/[id].js - Vercel Serverless Function for single Album
import { neon } from '@neondatabase/serverless';

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }

  const debug = String(req.query?.debug ?? '').trim() === '1';
  const withMeta = String(req.query?.meta ?? '').trim() === '1';
  const t0 = debug ? Date.now() : 0;
  const { id } = req.query; // album id or slug

  // Cache (public content). Use short CDN cache and allow stale-while-revalidate.
  if (req.method === 'GET') {
    const noCache = String(req.query?.nocache ?? req.query?.noCache ?? '').trim() === '1'
      || String(req.query?.debug ?? '').trim() === '1';
    if (noCache) {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400');
    }
  }

  // GET /api/albums/[id] - Lấy album với tất cả ảnh
  if (req.method === 'GET') {
    try {
      // Tìm album theo uuid hoặc slug
      const a0 = debug ? Date.now() : 0;
      const albumRows = await sql`
        SELECT id, slug, title, description, cover_url
        FROM albums
        WHERE id::text = ${id} OR slug = ${id} 
        LIMIT 1
      `;
      const a1 = debug ? Date.now() : 0;
      
      if (albumRows.length === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }

      const album = albumRows[0];
      
      // Lấy tất cả ảnh của album
      const i0 = debug ? Date.now() : 0;
      const imageRows = await sql`
        SELECT id, url, caption, sort_order
        FROM images 
        WHERE album_id = ${album.id} 
        ORDER BY sort_order, created_at
      `;
      const i1 = debug ? Date.now() : 0;

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

      if (withMeta) {
        return res.status(200).json({
          data: result,
          meta: {
            ...(debug ? { timingsMs: { albumQuery: a1 - a0, imagesQuery: i1 - i0, total: i1 - t0 } } : {}),
          },
        });
      }
      
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

      if (withMeta) {
        return res.status(201).json({
          data: rows[0],
          meta: {
            ...(debug ? { timingsMs: { total: Date.now() - t0 } } : {}),
          },
        });
      }

      return res.status(201).json(rows[0]);
    } catch (err) {
      console.error('POST /api/albums/[id]/images error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  // PUT /api/albums/[id] - Cập nhật album
  if (req.method === 'PUT') {
    try {
      const { title, description, cover_url } = req.body || {};
      
      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }
      
      const rows = await sql`
        UPDATE albums 
        SET title = ${title}, 
            description = ${description || null}, 
            cover_url = ${cover_url || null},
            updated_at = NOW()
        WHERE id::text = ${id} OR slug = ${id}
        RETURNING *
      `;
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }

      const payload = { message: 'Album updated', album: rows[0] };
      if (withMeta) {
        return res.status(200).json({
          data: payload,
          meta: {
            ...(debug ? { timingsMs: { total: Date.now() - t0 } } : {}),
          },
        });
      }

      return res.status(200).json(payload);
    } catch (err) {
      console.error('PUT /api/albums/[id] error:', err);
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

      const payload = { message: 'Album deleted', album: rows[0] };
      if (withMeta) {
        return res.status(200).json({
          data: payload,
          meta: {
            ...(debug ? { timingsMs: { total: Date.now() - t0 } } : {}),
          },
        });
      }

      return res.status(200).json(payload);
    } catch (err) {
      console.error('DELETE /api/albums/[id] error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
