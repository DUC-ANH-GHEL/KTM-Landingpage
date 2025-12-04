// api/video-folders.js - Vercel Serverless Function for Video Folders API
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS headers
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

  // GET /api/video-folders - Lấy danh sách folders với videos
  if (req.method === 'GET') {
    try {
      const { withVideos, slug, parent_id } = req.query;

      if (slug) {
        // Get single folder by slug
        const folders = await sql`
          SELECT id, name, slug, description, cover_image, sort_order, parent_id
          FROM video_folders
          WHERE slug = ${slug}
        `;
        
        if (folders.length === 0) {
          return res.status(404).json({ error: 'Folder not found' });
        }

        const folder = folders[0];
        
        // Get videos in folder
        const videos = await sql`
          SELECT id, title, youtube_id, thumbnail_url, sort_order
          FROM videos
          WHERE folder_id = ${folder.id}
          ORDER BY sort_order ASC, created_at DESC
        `;
        
        // Get subfolders count
        const subfolders = await sql`
          SELECT COUNT(*)::int as count FROM video_folders WHERE parent_id = ${folder.id}
        `;

        return res.status(200).json({
          ...folder,
          subfolderCount: subfolders[0]?.count || 0,
          videos: videos.map(v => ({
            id: v.id,
            title: v.title,
            youtubeId: v.youtube_id,
            thumb: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`,
            url: `https://www.youtube.com/embed/${v.youtube_id}`,
            sortOrder: v.sort_order
          }))
        });
      }

      // Build query based on parent_id
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
        // Get all folders (backward compatibility)
        folders = await sql`
          SELECT id, name, slug, description, cover_image, sort_order, parent_id
          FROM video_folders
          ORDER BY sort_order ASC, created_at DESC
        `;
      }

      if (withVideos === 'true') {
        // Get videos and subfolders for each folder
        const result = await Promise.all(folders.map(async (folder) => {
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
            videos: videos.map(v => ({
              id: v.id,
              title: v.title,
              youtubeId: v.youtube_id,
              thumb: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`,
              url: `https://www.youtube.com/embed/${v.youtube_id}`,
              sortOrder: v.sort_order
            }))
          };
        }));
        return res.status(200).json(result);
      }

      // Return folders without videos but with subfolder count
      const result = await Promise.all(folders.map(async (f) => {
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
          subfolderCount: subfolders[0]?.count || 0
        };
      }));

      return res.status(200).json(result);
    } catch (err) {
      console.error('GET /api/video-folders error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  // POST /api/video-folders - Tạo folder mới
  if (req.method === 'POST') {
    try {
      const { name, slug, description, coverImage, sortOrder, parent_id } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Generate slug if not provided
      const finalSlug = slug || name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
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
        sortOrder: folder.sort_order
      });
    } catch (err) {
      console.error('POST /api/video-folders error:', err);
      if (err.message?.includes('unique')) {
        return res.status(400).json({ error: 'Slug already exists' });
      }
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
