// api/albums.js - Vercel Serverless Function for Albums API
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

let _indexesEnsured = false;
let _indexesPromise = null;
async function ensureAlbumIndexesOnce(debug) {
  if (_indexesEnsured) return;
  if (!_indexesPromise) {
    _indexesPromise = (async () => {
      try {
        await sql`CREATE INDEX IF NOT EXISTS albums_parent_created_idx ON albums(parent_id, created_at DESC)`;
      } catch (e) {
        if (debug) console.warn('Index create skipped (albums_parent_created_idx):', e?.message || e);
      }
      try {
        await sql`CREATE INDEX IF NOT EXISTS albums_slug_idx ON albums(slug)`;
      } catch (e) {
        if (debug) console.warn('Index create skipped (albums_slug_idx):', e?.message || e);
      }
      try {
        await sql`CREATE INDEX IF NOT EXISTS images_album_sort_created_idx ON images(album_id, sort_order ASC, created_at DESC)`;
      } catch (e) {
        if (debug) console.warn('Index create skipped (images_album_sort_created_idx):', e?.message || e);
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

  // GET /api/albums - Lấy danh sách albums
  if (req.method === 'GET') {
    try {
      await ensureAlbumIndexesOnce(debug);
      const { parent_id } = req.query;

      const q0 = debug ? Date.now() : 0;
      
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
      
      const q1 = debug ? Date.now() : 0;

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

      if (withMeta) {
        const wrapped = {
          data: albums,
          meta: {
            count: albums.length,
            ...(debug ? { timingsMs: { query: q1 - q0, total: q1 - t0 } } : {}),
          },
        };

        if (maybeSetEtag(req, res, wrapped)) return;
        return res.status(200).json(wrapped);
      }

      if (maybeSetEtag(req, res, albums)) return;
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
