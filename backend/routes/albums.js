// routes/albums.js - Album API routes

const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/albums - Lấy danh sách albums với số lượng ảnh
router.get('/albums', async (req, res) => {
  try {
    const q = `
      SELECT a.id, a.slug, a.title, a.description, a.cover_url,
             (SELECT COUNT(*) FROM images i WHERE i.album_id = a.id)::int as image_count
      FROM albums a
      ORDER BY a.created_at DESC;
    `;
    const { rows } = await db.query(q);
    
    // Transform to match frontend format
    const albums = rows.map(row => ({
      id: row.slug || row.id,
      title: row.title,
      description: row.description,
      cover: row.cover_url,
      count: row.image_count,
      images: [] // images sẽ được load riêng khi click vào album
    }));
    
    res.json(albums);
  } catch (err) {
    console.error('GET /api/albums error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/albums/:id - Lấy album với tất cả ảnh
router.get('/albums/:id', async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    
    // Tìm album theo uuid hoặc slug
    const albumQ = `
      SELECT * FROM albums 
      WHERE id::text = $1 OR slug = $1 
      LIMIT 1
    `;
    const albumRes = await db.query(albumQ, [idOrSlug]);
    
    if (albumRes.rowCount === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }

    const album = albumRes.rows[0];
    
    // Lấy tất cả ảnh của album
    const imagesQ = `
      SELECT id, url, caption, sort_order, metadata 
      FROM images 
      WHERE album_id = $1 
      ORDER BY sort_order, created_at
    `;
    const imagesRes = await db.query(imagesQ, [album.id]);

    // Transform to match frontend format
    const result = {
      id: album.slug || album.id,
      title: album.title,
      description: album.description,
      cover: album.cover_url,
      count: imagesRes.rowCount,
      images: imagesRes.rows.map(img => ({
        src: img.url,
        caption: img.caption || ''
      }))
    };
    
    res.json(result);
  } catch (err) {
    console.error('GET /api/albums/:id error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/albums - Tạo album mới
router.post('/albums', async (req, res) => {
  try {
    const { slug, title, description, cover_url } = req.body;
    
    if (!slug || !title) {
      return res.status(400).json({ error: 'slug and title are required' });
    }
    
    const q = `
      INSERT INTO albums (slug, title, description, cover_url) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;
    const { rows } = await db.query(q, [slug, title, description || null, cover_url || null]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/albums error:', err);
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: 'Album slug already exists' });
    }
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/albums/:id/images - Thêm ảnh vào album
router.post('/albums/:id/images', async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const { url, caption, sort_order } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }
    
    // Tìm album_id từ slug hoặc uuid
    const albumQ = `SELECT id FROM albums WHERE id::text = $1 OR slug = $1 LIMIT 1`;
    const albumRes = await db.query(albumQ, [idOrSlug]);
    
    if (albumRes.rowCount === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    
    const albumId = albumRes.rows[0].id;
    
    const q = `
      INSERT INTO images (album_id, url, caption, sort_order) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;
    const { rows } = await db.query(q, [albumId, url, caption || null, sort_order || 0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/albums/:id/images error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/albums/:id - Xóa album (cascade xóa images)
router.delete('/albums/:id', async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const q = `DELETE FROM albums WHERE id::text = $1 OR slug = $1 RETURNING *`;
    const { rows, rowCount } = await db.query(q, [idOrSlug]);
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    
    res.json({ message: 'Album deleted', album: rows[0] });
  } catch (err) {
    console.error('DELETE /api/albums/:id error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/images/:id - Xóa ảnh
router.delete('/images/:id', async (req, res) => {
  try {
    const imageId = req.params.id;
    const q = `DELETE FROM images WHERE id = $1 RETURNING *`;
    const { rows, rowCount } = await db.query(q, [imageId]);
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    res.json({ message: 'Image deleted', image: rows[0] });
  } catch (err) {
    console.error('DELETE /api/images/:id error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
