import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = neon(process.env.DATABASE_URL);
  const { id } = req.query;

  try {
    if (req.method === 'DELETE') {
      // Delete image
      await sql`DELETE FROM images WHERE id = ${id}`;
      return res.status(200).json({ success: true, message: 'Image deleted' });
    }

    if (req.method === 'PUT') {
      // Move image to another album
      const { album_id, caption } = req.body || {};
      
      if (album_id) {
        // Move to new album
        await sql`UPDATE images SET album_id = ${album_id}::uuid, updated_at = NOW() WHERE id = ${id}::uuid`;
        return res.status(200).json({ success: true, message: 'Image moved successfully' });
      }
      
      if (caption !== undefined) {
        // Update caption
        await sql`UPDATE images SET caption = ${caption}, updated_at = NOW() WHERE id = ${id}::uuid`;
        return res.status(200).json({ success: true, message: 'Image updated' });
      }
      
      return res.status(400).json({ error: 'album_id or caption is required' });
    }

    res.setHeader('Allow', ['PUT', 'DELETE', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
