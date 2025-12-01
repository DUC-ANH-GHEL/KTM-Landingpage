// api/videos.js - Vercel Serverless Function for Videos API
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

  // GET /api/videos - Lấy danh sách videos
  if (req.method === 'GET') {
    try {
      const { category } = req.query;
      
      let rows;
      if (category) {
        rows = await sql`
          SELECT id, title, youtube_id, thumbnail_url, category, sort_order, created_at
          FROM videos
          WHERE category = ${category}
          ORDER BY sort_order ASC, created_at DESC
        `;
      } else {
        rows = await sql`
          SELECT id, title, youtube_id, thumbnail_url, category, sort_order, created_at
          FROM videos
          ORDER BY category, sort_order ASC, created_at DESC
        `;
      }
      
      // Transform to frontend format
      const videos = rows.map(row => ({
        id: row.id,
        title: row.title,
        youtubeId: row.youtube_id,
        thumb: row.thumbnail_url || `https://img.youtube.com/vi/${row.youtube_id}/hqdefault.jpg`,
        url: `https://www.youtube.com/embed/${row.youtube_id}`,
        category: row.category,
        sortOrder: row.sort_order
      }));
      
      return res.status(200).json(videos);
    } catch (err) {
      console.error('GET /api/videos error:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  // POST /api/videos - Tạo video mới
  if (req.method === 'POST') {
    try {
      const { title, youtube_id, youtube_url, thumbnail_url, category, sort_order } = req.body || {};
      
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
        INSERT INTO videos (title, youtube_id, thumbnail_url, category, sort_order) 
        VALUES (
          ${title || 'Video'}, 
          ${videoId}, 
          ${thumbnail_url || null}, 
          ${category || 'instruction'},
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
