
      return res.status(201).json(result[0]);
    }

    // PUT - Cập nhật sản phẩm
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { name, code, price, image, category, note, sort_order, commission_percent, variants, attributes } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      const commission = normalizeCommissionPercent(commission_percent);
      const normalizedVariants = normalizeVariants(variants, price);
      const variantsJson = normalizedVariants != null ? JSON.stringify(normalizedVariants) : null;

      const normalizedAttributes = normalizeAttributes(attributes);
      const attributesJson = normalizedAttributes != null ? JSON.stringify(normalizedAttributes) : null;

      const result = await sql`
        UPDATE products 
        SET 
          name = COALESCE(${name}, name),
          code = COALESCE(${code}, code),
          price = COALESCE(${price}, price),
          image = COALESCE(${image}, image),
          category = COALESCE(${category}, category),
          note = COALESCE(${note}, note),
          sort_order = COALESCE(${sort_order}, sort_order),
          commission_percent = COALESCE(${commission}, commission_percent),
          variants = COALESCE(${variantsJson}::jsonb, variants),
          attributes = COALESCE(${attributesJson}::jsonb, attributes),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json(result[0]);
    }

    // DELETE - Xóa sản phẩm
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING *`;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json({ message: 'Product deleted', product: result[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Products API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Helper: Xóa ảnh trên Cloudinary
async function deleteCloudinaryImage(imageUrl) {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return { success: false };
  
  const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'diwxfpt92';
  const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
  const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return { success: false, error: 'Cloudinary credentials not configured' };
  }

  try {
    // Extract publicId từ URL
    const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
    if (!match) return { success: false, error: 'Invalid URL' };
    
    const publicId = match[1];
    const timestamp = Math.round(Date.now() / 1000);
    const signatureString = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
      { method: 'POST', body: formData }
    );

    const data = await response.json();
    return { success: data.result === 'ok' || data.result === 'not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
