// api/videos.js - Vercel Serverless Function for Videos API
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

let _indexesEnsured = false;
let _indexesPromise = null;
async function ensureVideoIndexesOnce(debug) {
  if (_indexesEnsured) return;
  if (!_indexesPromise) {
    _indexesPromise = (async () => {
      try {
        await sql`CREATE INDEX IF NOT EXISTS videos_folder_sort_created_idx ON videos(folder_id, sort_order ASC, created_at DESC)`;
      } catch (e) {
        if (debug) console.warn('Index create skipped (videos_folder_sort_created_idx):', e?.message || e);
      }
      try {
        await sql`CREATE INDEX IF NOT EXISTS videos_category_sort_created_idx ON videos(category, sort_order ASC, created_at DESC)`;
      } catch (e) {
        if (debug) console.warn('Index create skipped (videos_category_sort_created_idx):', e?.message || e);
      }
      _indexesEnsured = true;
    })().catch((err) => {
      _indexesPromise = null;
      if (debug) console.warn('Index create failed:', err?.message || err);
    });
  }
  return _indexesPromise;
}

function maybeSetEtag(req, res, payload) {
  try {
    const body = JSON.stringify(payload);
    const etag = `W/"${crypto.createHash('sha1').update(body).digest('base64').slice(0, 16)}"`;
    res.setHeader('ETag', etag);
    if (String(req.headers['if-none-match'] || '') === etag) {
      res.status(304).end();
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

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

  const debug = String(req.query?.debug ?? '').trim() === '1';
  const withMeta = String(req.query?.meta ?? '').trim() === '1';
  const t0 = debug ? Date.now() : 0;

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

  // GET /api/videos - Lấy danh sách videos
  if (req.method === 'GET') {
    try {
      await ensureVideoIndexesOnce(debug);
      const { category, folderId, limit } = req.query;

      const q0 = debug ? Date.now() : 0;
      
      let rows;
      if (folderId) {
        // Filter by folder
        if (limit) {
          rows = await sql`
            SELECT v.id, v.title, v.youtube_id, v.thumbnail_url, v.category, v.folder_id, v.sort_order, v.created_at
            FROM videos v
            WHERE v.folder_id = ${folderId}::uuid
            ORDER BY v.sort_order ASC, v.created_at DESC
            LIMIT ${parseInt(limit)}
          `;
        } else {
          rows = await sql`
            SELECT v.id, v.title, v.youtube_id, v.thumbnail_url, v.category, v.folder_id, v.sort_order, v.created_at
            FROM videos v
            WHERE v.folder_id = ${folderId}::uuid
            ORDER BY v.sort_order ASC, v.created_at DESC
          `;
        }
      } else if (category) {
        rows = await sql`
          SELECT id, title, youtube_id, thumbnail_url, category, folder_id, sort_order, created_at
          FROM videos
          WHERE category = ${category}
          ORDER BY sort_order ASC, created_at DESC
        `;
      } else {
        rows = await sql`
          SELECT id, title, youtube_id, thumbnail_url, category, folder_id, sort_order, created_at
          FROM videos
          ORDER BY category, sort_order ASC, created_at DESC
        `;
      }
      
      const q1 = debug ? Date.now() : 0;

      // Transform to frontend format
      const videos = rows.map(row => ({
        id: row.id,
        title: row.title,
        youtubeId: row.youtube_id,
        thumb: row.thumbnail_url || `https://img.youtube.com/vi/${row.youtube_id}/hqdefault.jpg`,
        url: `https://www.youtube.com/embed/${row.youtube_id}`,
        category: row.category,
        folderId: row.folder_id,
        sortOrder: row.sort_order
      }));

      if (withMeta) {
        const wrapped = {
          data: videos,
          meta: {
            count: videos.length,
            ...(debug ? { timingsMs: { query: q1 - q0, total: q1 - t0 } } : {}),
          },
        };

        if (maybeSetEtag(req, res, wrapped)) return;
        return res.status(200).json(wrapped);
      }

      if (maybeSetEtag(req, res, videos)) return;
      return res.status(200).json(videos);
    } catch (err) {
      console.error('GET /api/videos error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  // POST /api/videos - Tạo video mới
  if (req.method === 'POST') {
    try {
      const { title, youtube_id, youtube_url, thumbnail_url, category, folder_id, sort_order } = req.body || {};
      
      // Extract youtube_id from URL if provided
      let videoId = youtube_id;
      if (!videoId && youtube_url) {
        // Support various YouTube URL formats
        const match = youtube_url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : null;
      }
      
      if (!videoId) {
        return res.status(400).json({ error: 'youtube_id or valid youtube_url is required' });
      }
      
      const rows = await sql`
        INSERT INTO videos (title, youtube_id, thumbnail_url, category, folder_id, sort_order) 
        VALUES (
          ${title || 'Video'}, 
          ${videoId}, 
          ${thumbnail_url || null}, 
          ${category || 'instruction'},
          ${folder_id || null},
          ${sort_order || 0}
        ) 
        RETURNING *
      `;
      
      return res.status(201).json(rows[0]);
    } catch (err) {
      console.error('POST /api/videos error:', err);
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Video đã tồn tại' });
      }
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
