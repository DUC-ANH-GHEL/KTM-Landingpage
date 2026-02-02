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
        await sql`CREATE INDEX IF NOT EXISTS video_folders_parent_sort_created_idx ON video_folders(parent_id, sort_order ASC, created_at DESC)`;
      } catch (e) {
        if (debug) console.warn('Index create skipped (video_folders_parent_sort_created_idx):', e?.message || e);
      }
      try {
        await sql`CREATE INDEX IF NOT EXISTS video_folders_slug_idx ON video_folders(slug)`;
      } catch (e) {
        if (debug) console.warn('Index create skipped (video_folders_slug_idx):', e?.message || e);
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

  // Rewrites will pass id via query (?id=...)
  const id = req.query.id || req.body?.id;

  try {
    // GET /api/video-folders and GET /api/video-folders/:id
    if (req.method === 'GET') {
      await ensureVideoIndexesOnce(debug);

      if (id) {
        const q0 = debug ? Date.now() : 0;
        const folders = await sql`
          SELECT id, name, slug, description, cover_image, sort_order
          FROM video_folders
          WHERE id = ${id}::uuid
        `;

        const q1 = debug ? Date.now() : 0;

        if (!folders.length) return res.status(404).json({ error: 'Folder not found' });

        const folder = folders[0];
        const v0 = debug ? Date.now() : 0;
        const videos = await sql`
          SELECT id, title, youtube_id, thumbnail_url, sort_order
          FROM videos
          WHERE folder_id = ${id}::uuid
          ORDER BY sort_order ASC, created_at DESC
        `;

        const v1 = debug ? Date.now() : 0;

        const payload = {
          id: folder.id,
          name: folder.name,
          slug: folder.slug,
          description: folder.description,
          coverImage: folder.cover_image,
          sortOrder: folder.sort_order,
          videos: videos.map((v) => ({
            id: v.id,
            title: v.title,
            youtubeId: v.youtube_id,
            thumb: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`,
            url: `https://www.youtube.com/embed/${v.youtube_id}`,
            sortOrder: v.sort_order,
          })),
        };

        if (withMeta) {
          const wrapped = {
            data: payload,
            meta: {
              ...(debug ? { timingsMs: { folderQuery: q1 - q0, videosQuery: v1 - v0, total: v1 - t0 } } : {}),
            },
          };
          if (maybeSetEtag(req, res, wrapped)) return;
          return res.status(200).json(wrapped);
        }

        if (maybeSetEtag(req, res, payload)) return;
        return res.status(200).json(payload);
      }

      const { withVideos, slug, parent_id } = req.query;

      if (slug) {
        const folders = await sql`
          SELECT id, name, slug, description, cover_image, sort_order, parent_id
          FROM video_folders
          WHERE slug = ${slug}
        `;

        if (!folders.length) return res.status(404).json({ error: 'Folder not found' });

        const folder = folders[0];
        const videos = await sql`
          SELECT id, title, youtube_id, thumbnail_url, sort_order
          FROM videos
          WHERE folder_id = ${folder.id}
          ORDER BY sort_order ASC, created_at DESC
        `;

        const subfolders = await sql`
          SELECT COUNT(*)::int as count FROM video_folders WHERE parent_id = ${folder.id}
        `;

        return res.status(200).json({
          ...folder,
          subfolderCount: subfolders[0]?.count || 0,
          videos: videos.map((v) => ({
            id: v.id,
            title: v.title,
            youtubeId: v.youtube_id,
            thumb: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`,
            url: `https://www.youtube.com/embed/${v.youtube_id}`,
            sortOrder: v.sort_order,
          })),
        });
      }

      let folders;
      if (parent_id === 'root' || parent_id === '') {
        folders = await sql`
          SELECT f.id, f.name, f.slug, f.description, f.cover_image, f.sort_order, f.parent_id,
                 COALESCE(sf.count, 0)::int AS subfolder_count
          FROM video_folders f
          LEFT JOIN (
            SELECT parent_id, COUNT(*)::int AS count
            FROM video_folders
            GROUP BY parent_id
          ) sf ON sf.parent_id = f.id
          WHERE f.parent_id IS NULL
          ORDER BY f.sort_order ASC, f.created_at DESC
        `;
      } else if (parent_id) {
        folders = await sql`
          SELECT f.id, f.name, f.slug, f.description, f.cover_image, f.sort_order, f.parent_id,
                 COALESCE(sf.count, 0)::int AS subfolder_count
          FROM video_folders f
          LEFT JOIN (
            SELECT parent_id, COUNT(*)::int AS count
            FROM video_folders
            GROUP BY parent_id
          ) sf ON sf.parent_id = f.id
          WHERE f.parent_id = ${parent_id}::uuid
          ORDER BY f.sort_order ASC, f.created_at DESC
        `;
      } else {
        folders = await sql`
          SELECT f.id, f.name, f.slug, f.description, f.cover_image, f.sort_order, f.parent_id,
                 COALESCE(sf.count, 0)::int AS subfolder_count
          FROM video_folders f
          LEFT JOIN (
            SELECT parent_id, COUNT(*)::int AS count
            FROM video_folders
            GROUP BY parent_id
          ) sf ON sf.parent_id = f.id
          ORDER BY f.sort_order ASC, f.created_at DESC
        `;
      }

      if (withVideos === 'true') {
        const q0 = debug ? Date.now() : 0;
        const folderIds = (Array.isArray(folders) ? folders : []).map((f) => f.id).filter(Boolean);

        let videosRows = [];
        const v0 = debug ? Date.now() : 0;
        if (folderIds.length) {
          videosRows = await sql(
            `SELECT id, title, youtube_id, thumbnail_url, sort_order, folder_id
             FROM videos
             WHERE folder_id = ANY($1::uuid[])
             ORDER BY folder_id, sort_order ASC, created_at DESC`,
            [folderIds],
          );
        }
        const v1 = debug ? Date.now() : 0;

        const videosByFolder = new Map();
        for (const row of Array.isArray(videosRows) ? videosRows : []) {
          const fid = row.folder_id;
          if (!fid) continue;
          const arr = videosByFolder.get(fid) || [];
          arr.push(row);
          videosByFolder.set(fid, arr);
        }

        const result = (Array.isArray(folders) ? folders : []).map((folder) => {
          const vids = videosByFolder.get(folder.id) || [];
          return {
            id: folder.id,
            name: folder.name,
            slug: folder.slug,
            description: folder.description,
            coverImage: folder.cover_image,
            sortOrder: folder.sort_order,
            parentId: folder.parent_id,
            videoCount: vids.length,
            subfolderCount: folder.subfolder_count || 0,
            videos: vids.map((v) => ({
              id: v.id,
              title: v.title,
              youtubeId: v.youtube_id,
              thumb: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`,
              url: `https://www.youtube.com/embed/${v.youtube_id}`,
              sortOrder: v.sort_order,
            })),
          };
        });

        const q1 = debug ? Date.now() : 0;

        if (withMeta) {
          const wrapped = {
            data: result,
            meta: {
              count: result.length,
              ...(debug ? { timingsMs: { folders: q1 - q0, videos: v1 - v0, total: q1 - t0 } } : {}),
            },
          };
          if (maybeSetEtag(req, res, wrapped)) return;
          return res.status(200).json(wrapped);
        }

        if (maybeSetEtag(req, res, result)) return;
        return res.status(200).json(result);
      }

      const result = folders.map((f) => ({
        id: f.id,
        name: f.name,
        slug: f.slug,
        description: f.description,
        coverImage: f.cover_image,
        sortOrder: f.sort_order,
        parentId: f.parent_id,
        subfolderCount: f.subfolder_count || 0,
      }));

      if (withMeta) {
        const wrapped = {
          data: result,
          meta: {
            count: result.length,
            ...(debug ? { timingsMs: { total: Date.now() - t0 } } : {}),
          },
        };
        if (maybeSetEtag(req, res, wrapped)) return;
        return res.status(200).json(wrapped);
      }

      if (maybeSetEtag(req, res, result)) return;
      return res.status(200).json(result);
    }

    // POST /api/video-folders
    if (req.method === 'POST') {
      if (id) {
        return res.status(400).json({ error: 'Use /api/video-folders to create folders (no id in URL)' });
      }

      const { name, slug, description, coverImage, sortOrder, parent_id } = req.body;

      if (!name) return res.status(400).json({ error: 'Name is required' });

      const finalSlug = (slug || name)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const rows = await sql`
        INSERT INTO video_folders (name, slug, description, cover_image, sort_order, parent_id)
        VALUES (${name}, ${finalSlug}, ${description || null}, ${coverImage || null}, ${sortOrder || 0}, ${parent_id || null})
        RETURNING id, name, slug, description, cover_image, sort_order, parent_id
      `;

      const folder = rows[0];
      return res.status(201).json({
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        description: folder.description,
        coverImage: folder.cover_image,
        sortOrder: folder.sort_order,
      });
    }

    // PUT /api/video-folders/:id
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Folder ID is required' });

      const { name, slug, description, coverImage, sortOrder } = req.body;

      const current = await sql`
        SELECT id, name, slug, description, cover_image, sort_order
        FROM video_folders
        WHERE id = ${id}::uuid
      `;
      if (!current.length) return res.status(404).json({ error: 'Folder not found' });

      const newName = name !== undefined ? name : current[0].name;
      const newSlug = slug !== undefined ? slug : current[0].slug;
      const newDesc = description !== undefined ? description : current[0].description;
      const newCover = coverImage !== undefined ? coverImage || null : current[0].cover_image;
      const newSort = sortOrder !== undefined ? sortOrder : current[0].sort_order;

      const rows = await sql`
        UPDATE video_folders
        SET
          name = ${newName},
          slug = ${newSlug},
          description = ${newDesc},
          cover_image = ${newCover},
          sort_order = ${newSort},
          updated_at = NOW()
        WHERE id = ${id}::uuid
        RETURNING id, name, slug, description, cover_image, sort_order
      `;

      if (!rows.length) return res.status(404).json({ error: 'Folder not found' });

      const folder = rows[0];
      return res.status(200).json({
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        description: folder.description,
        coverImage: folder.cover_image,
        sortOrder: folder.sort_order,
      });
    }

    // DELETE /api/video-folders/:id
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Folder ID is required' });

      await sql`UPDATE videos SET folder_id = NULL WHERE folder_id = ${id}::uuid`;

      const rows = await sql`
        DELETE FROM video_folders
        WHERE id = ${id}::uuid
        RETURNING id
      `;

      if (!rows.length) return res.status(404).json({ error: 'Folder not found' });

      return res.status(200).json({ success: true, id: rows[0].id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Video folders API error:', err);
    return res.status(500).json({ error: 'Database error', detail: err.message });
  }
}
