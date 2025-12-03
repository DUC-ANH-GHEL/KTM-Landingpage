/**
 * api/cloudinary-delete.js - Xóa ảnh trên Cloudinary
 * 
 * Endpoint: POST /api/cloudinary-delete
 * Body: { publicId } hoặc { url }
 */
import crypto from 'crypto';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'diwxfpt92';
  const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
  const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return res.status(500).json({ error: 'Cloudinary credentials not configured' });
  }

  try {
    let { publicId, url } = req.body;

    // Nếu truyền URL, extract publicId từ URL
    if (!publicId && url) {
      // URL format: https://res.cloudinary.com/diwxfpt92/image/upload/v1234567890/folder/filename.jpg
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
      if (match) {
        publicId = match[1];
      }
    }

    if (!publicId) {
      return res.status(400).json({ error: 'publicId or url is required' });
    }

    // Tạo signature để authenticate với Cloudinary
    const timestamp = Math.round(Date.now() / 1000);
    const signatureString = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

    // Gọi Cloudinary API để xóa
    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
      {
        method: 'POST',
        body: formData
      }
    );

    const data = await response.json();

    if (data.result === 'ok') {
      return res.status(200).json({ success: true, message: 'Image deleted successfully' });
    } else if (data.result === 'not found') {
      return res.status(200).json({ success: true, message: 'Image already deleted or not found' });
    } else {
      return res.status(400).json({ success: false, error: data });
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return res.status(500).json({ error: error.message });
  }
}
