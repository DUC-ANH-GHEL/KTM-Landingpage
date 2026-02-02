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

  try {
    if (req.method === 'DELETE') {
      // Delete image
      await sql`DELETE FROM images WHERE id = ${id}`;

      const payload = { success: true, message: 'Image deleted' };
      if (withMeta) {
        return res.status(200).json({
          data: payload,
          meta: {
            ...(debug ? { timingsMs: { total: Date.now() - t0 } } : {}),
          },
        });
      }

      return res.status(200).json(payload);
    }

    if (req.method === 'PUT') {
      // Move image to another album
      const { album_id, caption } = req.body || {};
      
      if (album_id) {
        // Move to new album
        await sql`UPDATE images SET album_id = ${album_id}::uuid, updated_at = NOW() WHERE id = ${id}::uuid`;

        const payload = { success: true, message: 'Image moved successfully' };
        if (withMeta) {
          return res.status(200).json({
            data: payload,
            meta: {
              ...(debug ? { timingsMs: { total: Date.now() - t0 } } : {}),
            },
          });
        }

        return res.status(200).json(payload);
      }
      
      if (caption !== undefined) {
        // Update caption
        await sql`UPDATE images SET caption = ${caption}, updated_at = NOW() WHERE id = ${id}::uuid`;

        const payload = { success: true, message: 'Image updated' };
        if (withMeta) {
          return res.status(200).json({
            data: payload,
            meta: {
              ...(debug ? { timingsMs: { total: Date.now() - t0 } } : {}),
            },
          });
        }

        return res.status(200).json(payload);
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
