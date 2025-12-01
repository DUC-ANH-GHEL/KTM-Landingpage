// api/video-folders/[id].js - Single video folder operations
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }

  const sql = neon(process.env.DATABASE_URL);
  const { id } = req.query;

  // GET /api/video-folders/[id] - Lấy folder với videos
  if (req.method === 'GET') {
    try {
      const folders = await sql`
        SELECT id, name, slug, description, cover_image, sort_order
        FROM video_folders
        WHERE id = ${id}::uuid
      `;

      if (folders.length === 0) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      const folder = folders[0];

      // Get videos in folder
      const videos = await sql`
        SELECT id, title, youtube_id, thumbnail_url, sort_order
        FROM videos
        WHERE folder_id = ${id}::uuid
        ORDER BY sort_order ASC, created_at DESC
      `;

      return res.status(200).json({
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        description: folder.description,
        coverImage: folder.cover_image,
        sortOrder: folder.sort_order,
        videos: videos.map(v => ({
          id: v.id,
          title: v.title,
          youtubeId: v.youtube_id,
          thumb: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`,
          url: `https://www.youtube.com/embed/${v.youtube_id}`,
          sortOrder: v.sort_order
        }))
      });
    } catch (err) {
      console.error('GET /api/video-folders/[id] error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  // PUT /api/video-folders/[id] - Cập nhật folder
  if (req.method === 'PUT') {
    try {
      const { name, slug, description, coverImage, sortOrder } = req.body;

      const rows = await sql`
        UPDATE video_folders
        SET 
          name = COALESCE(${name}, name),
          slug = COALESCE(${slug}, slug),
          description = COALESCE(${description}, description),
          cover_image = COALESCE(${coverImage}, cover_image),
          sort_order = COALESCE(${sortOrder}, sort_order),
          updated_at = NOW()
        WHERE id = ${id}::uuid
        RETURNING id, name, slug, description, cover_image, sort_order
      `;

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      const folder = rows[0];
      return res.status(200).json({
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        description: folder.description,
        coverImage: folder.cover_image,
        sortOrder: folder.sort_order
      });
    } catch (err) {
      console.error('PUT /api/video-folders/[id] error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  // DELETE /api/video-folders/[id] - Xóa folder
  if (req.method === 'DELETE') {
    try {
      // First, unlink videos from this folder
      await sql`UPDATE videos SET folder_id = NULL WHERE folder_id = ${id}::uuid`;

      // Then delete folder
      const rows = await sql`
        DELETE FROM video_folders
        WHERE id = ${id}::uuid
        RETURNING id
      `;

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      return res.status(200).json({ success: true, id: rows[0].id });
    } catch (err) {
      console.error('DELETE /api/video-folders/[id] error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
