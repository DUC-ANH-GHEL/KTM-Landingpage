// api/videos/[id].js - Vercel Serverless Function for single Video
import { neon } from '@neondatabase/serverless';

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
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
  const { id } = req.query;

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

  // GET /api/videos/[id] - Lấy chi tiết video
  if (req.method === 'GET') {
    try {
      const q0 = debug ? Date.now() : 0;
      const rows = await sql`SELECT * FROM videos WHERE id = ${id}`;
      const q1 = debug ? Date.now() : 0;
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Video not found' });
      }

      const row = rows[0];
      const result = {
        id: row.id,
        title: row.title,
        youtubeId: row.youtube_id,
        thumb: row.thumbnail_url || `https://img.youtube.com/vi/${row.youtube_id}/hqdefault.jpg`,
        url: `https://www.youtube.com/embed/${row.youtube_id}`,
        category: row.category,
        sortOrder: row.sort_order
      };

      if (withMeta) {
        return res.status(200).json({
          data: result,
          meta: {
            ...(debug ? { timingsMs: { query: q1 - q0, total: q1 - t0 } } : {}),
          },
        });
      }

      return res.status(200).json(result);
    } catch (err) {
      console.error('GET /api/videos/[id] error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  // PUT /api/videos/[id] - Cập nhật video
  if (req.method === 'PUT') {
    try {
      const { title, youtube_id, youtube_url, thumbnail_url, category, folder_id, sort_order } = req.body || {};
      
      // Extract youtube_id from URL if provided
      let videoId = youtube_id;
      if (!videoId && youtube_url) {
        const match = youtube_url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : null;
      }
      
      const rows = await sql`
        UPDATE videos SET
          title = COALESCE(${title}, title),
          youtube_id = COALESCE(${videoId}, youtube_id),
          thumbnail_url = COALESCE(${thumbnail_url}, thumbnail_url),
          category = COALESCE(${category}, category),
          folder_id = COALESCE(${folder_id}, folder_id),
          sort_order = COALESCE(${sort_order}, sort_order),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Video not found' });
      }

      if (withMeta) {
        return res.status(200).json({
          data: rows[0],
          meta: {
            ...(debug ? { timingsMs: { total: Date.now() - t0 } } : {}),
          },
        });
      }

      return res.status(200).json(rows[0]);
    } catch (err) {
      console.error('PUT /api/videos/[id] error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  // DELETE /api/videos/[id] - Xóa video
  if (req.method === 'DELETE') {
    try {
      const rows = await sql`DELETE FROM videos WHERE id = ${id} RETURNING *`;
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Video not found' });
      }

      const payload = { success: true, message: 'Video deleted' };
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
      console.error('DELETE /api/videos/[id] error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'OPTIONS']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
