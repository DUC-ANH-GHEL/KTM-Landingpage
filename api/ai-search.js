// api/ai-search.js - AI-powered semantic search
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

  const { query, products } = req.body;

  if (!query || !products || !Array.isArray(products)) {
    return res.status(400).json({ error: 'query and products array are required' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  // Fallback to smart local filter if no API key
  if (!GEMINI_API_KEY) {
    const matchedIds = smartLocalFilter(query, products);
    return res.status(200).json({ matchedIds, query, fallback: true });
  }

  try {
    // Limit products to avoid token limits
    const limitedProducts = products.slice(0, 50);
    
    const productListText = limitedProducts.map((p, i) => 
      `${i + 1}. [ID: ${p.id}] ${p.name}${p.price ? ` - ${p.price}` : ''}${p.note ? ` (${p.note})` : ''}`
    ).join('\n');

    const prompt = `Bạn là hệ thống tìm kiếm sản phẩm thủy lực KTM. 

Người dùng tìm: "${query}"

Danh sách sản phẩm:
${productListText}

QUY TẮC:
1. "van X tay" = van có X tay điều khiển
2. "X ty" = có X xy lanh/ty
3. Nếu tìm "van 3 tay 2 ty" thì phải có CẢ "3 tay" VÀ "2 ty"
4. Chỉ trả về sản phẩm THỰC SỰ khớp

TRẢ LỜI: Chỉ JSON array chứa ID phù hợp, không giải thích.
Ví dụ: ["prod_1", "prod_5"]
Nếu không có: []`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      // Fallback
      const matchedIds = smartLocalFilter(query, products);
      return res.status(200).json({ matchedIds, query, fallback: true });
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    let matchedIds = [];
    try {
      const jsonMatch = aiText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        matchedIds = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('Parse error:', parseErr);
      matchedIds = smartLocalFilter(query, products);
    }

    return res.status(200).json({ matchedIds, query, totalProducts: products.length });

  } catch (err) {
    console.error('AI Search error:', err);
    const matchedIds = smartLocalFilter(query, products);
    return res.status(200).json({ matchedIds, query, fallback: true });
  }
}

// Smart local filter as fallback
function smartLocalFilter(query, products) {
  const lowerQuery = query.toLowerCase();
  
  // Extract "X tay" and "X ty"
  const tayMatch = lowerQuery.match(/(\d+)\s*tay/);
  const tyMatch = lowerQuery.match(/(\d+)\s*(ty|xi\s*lanh|xylanh)/);
  const tayNum = tayMatch ? tayMatch[1] : null;
  const tyNum = tyMatch ? tyMatch[1] : null;
  
  // Other keywords
  const keywords = lowerQuery
    .replace(/\d+\s*tay/g, '')
    .replace(/\d+\s*(ty|xi\s*lanh|xylanh)/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 2);

  const filtered = products.filter(p => {
    const name = (p.name || '').toLowerCase();
    
    // Check tay
    if (tayNum) {
      const productTay = name.match(/(\d+)\s*tay/);
      if (!productTay || productTay[1] !== tayNum) return false;
    }
    
    // Check ty  
    if (tyNum) {
      const productTy = name.match(/(\d+)\s*(ty|xi\s*lanh|xylanh)/);
      if (!productTy || productTy[1] !== tyNum) return false;
    }
    
    // Check keywords
    if (keywords.length > 0) {
      return keywords.some(kw => name.includes(kw));
    }
    
    return true;
  });

  return filtered.map(p => p.id);
}
