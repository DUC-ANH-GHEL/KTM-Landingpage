import { neon } from '@neondatabase/serverless';

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

  const sql = neon(process.env.DATABASE_URL);
  const pathParam = req.query.path;
  const folderId = Array.isArray(pathParam) && pathParam.length ? pathParam[0] : pathParam;

  try {
    if (req.method === 'GET') {
      if (folderId) {
        const folders = await sql`
          SELECT id, name, slug, description, cover_image, sort_order
          FROM video_folders
          WHERE id = ${folderId}::uuid
        `;

        if (!folders.length) {
          return res.status(404).json({ error: 'Folder not found' });
        }

        const folder = folders[0];
        const videos = await sql`
          SELECT id, title, youtube_id, thumbnail_url, sort_order
          FROM videos
          WHERE folder_id = ${folderId}::uuid
          ORDER BY sort_order ASC, created_at DESC
        `;

        return res.status(200).json({
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
        });
      }

      const { withVideos, slug: slugQuery, parent_id } = req.query;

      if (slugQuery) {
        const folders = await sql`
          SELECT id, name, slug, description, cover_image, sort_order, parent_id
          FROM video_folders
          WHERE slug = ${slugQuery}
        `;

        if (folders.length === 0) {
          return res.status(404).json({ error: 'Folder not found' });
        }

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
          SELECT id, name, slug, description, cover_image, sort_order, parent_id
          FROM video_folders
          WHERE parent_id IS NULL
          ORDER BY sort_order ASC, created_at DESC
        `;
      } else if (parent_id) {
        folders = await sql`
          SELECT id, name, slug, description, cover_image, sort_order, parent_id
          FROM video_folders
          WHERE parent_id = ${parent_id}::uuid
          ORDER BY sort_order ASC, created_at DESC
        `;
      } else {
        folders = await sql`
          SELECT id, name, slug, description, cover_image, sort_order, parent_id
          FROM video_folders
          ORDER BY sort_order ASC, created_at DESC
        `;
      }

      if (withVideos === 'true') {
        const result = await Promise.all(
          folders.map(async (folder) => {
            const videos = await sql`
              SELECT id, title, youtube_id, thumbnail_url, sort_order
              FROM videos
              WHERE folder_id = ${folder.id}
              ORDER BY sort_order ASC, created_at DESC
            `;
            const subfolders = await sql`
              SELECT COUNT(*)::int as count FROM video_folders WHERE parent_id = ${folder.id}
            `;
            return {
              id: folder.id,
              name: folder.name,
              slug: folder.slug,
              description: folder.description,
              coverImage: folder.cover_image,
              sortOrder: folder.sort_order,
              parentId: folder.parent_id,
              videoCount: videos.length,
              subfolderCount: subfolders[0]?.count || 0,
              videos: videos.map((v) => ({
                id: v.id,
                title: v.title,
                youtubeId: v.youtube_id,
                thumb: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`,
                url: `https://www.youtube.com/embed/${v.youtube_id}`,
                sortOrder: v.sort_order,
              })),
            };
          }),
        );
        return res.status(200).json(result);
      }

      const result = await Promise.all(
        folders.map(async (f) => {
          const subfolders = await sql`
            SELECT COUNT(*)::int as count FROM video_folders WHERE parent_id = ${f.id}
          `;
          return {
            id: f.id,
            name: f.name,
            slug: f.slug,
            description: f.description,
            coverImage: f.cover_image,
            sortOrder: f.sort_order,
            parentId: f.parent_id,
            subfolderCount: subfolders[0]?.count || 0,
          };
        }),
      );

      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      if (folderId) {
        return res.status(400).json({ error: 'Use /api/video-folders to create folders' });
      }

      const { name, slug, description, coverImage, sortOrder, parent_id } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

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

    if (req.method === 'PUT') {
      if (!folderId) {
        return res.status(400).json({ error: 'Folder ID is required' });
      }

      const { name, slug, description, coverImage, sortOrder } = req.body;

      const current = await sql`SELECT * FROM video_folders WHERE id = ${folderId}::uuid`;
      if (!current.length) {
        return res.status(404).json({ error: 'Folder not found' });
      }

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
        WHERE id = ${folderId}::uuid
        RETURNING id, name, slug, description, cover_image, sort_order
      `;

      if (!rows.length) {
        return res.status(404).json({ error: 'Folder not found' });
      }

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

    if (req.method === 'DELETE') {
      if (!folderId) {
        return res.status(400).json({ error: 'Folder ID is required' });
      }

      await sql`UPDATE videos SET folder_id = NULL WHERE folder_id = ${folderId}::uuid`;

      const rows = await sql`
        DELETE FROM video_folders
        WHERE id = ${folderId}::uuid
        RETURNING id
      `;

      if (!rows.length) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      return res.status(200).json({ success: true, id: rows[0].id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Video folders API error:', err);
    return res.status(500).json({ error: 'Database error', detail: err.message });
  }
}
