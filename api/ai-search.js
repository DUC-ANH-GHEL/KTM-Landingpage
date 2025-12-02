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

  // Check for Gemini API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback: do smart local filtering instead
    console.log('No GEMINI_API_KEY, using local smart filter');
    const matchedIds = smartLocalFilter(query, products);
    return res.status(200).json({ matchedIds, query, fallback: true });
  }

  try {
    // Limit products to avoid token limits
    const limitedProducts = products.slice(0, 50);
    
    // Prepare product list for AI
    const productListText = limitedProducts.map((p, i) => 
      `${i + 1}. [ID: ${p.id}] ${p.name}${p.price ? ` - ${p.price}` : ''}${p.note ? ` (${p.note})` : ''}`
    ).join('\n');

    const prompt = `Bạn là hệ thống tìm kiếm sản phẩm thủy lực KTM. 

Người dùng tìm: "${query}"

Danh sách sản phẩm có thể phù hợp:
${productListText}

NHIỆM VỤ: Phân tích câu tìm kiếm và chọn CHÍNH XÁC các sản phẩm phù hợp.

QUY TẮC:
1. "van X tay" = van có X tay điều khiển (1 tay, 2 tay, 3 tay, 4 tay, 5 tay)
2. "X ty" hoặc "X xi lanh" = có X xy lanh/ty (1 ty, 2 ty, 3 ty...)
3. Nếu tìm "van 3 tay 2 ty" thì phải có CẢ "3 tay" VÀ "2 ty" trong tên
4. "combo" = bộ sản phẩm đi kèm
5. "nghiêng", "giữa" = vị trí lắp đặt
6. Chỉ trả về sản phẩm THỰC SỰ khớp với yêu cầu

TRẢ LỜI: Chỉ trả về JSON array chứa các ID sản phẩm phù hợp, không giải thích.
Ví dụ: ["prod_1", "prod_5", "prod_8"]
Nếu không có sản phẩm nào phù hợp chính xác, trả về: []`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', response.status, errorData);
      // Fallback to local filter
      const matchedIds = smartLocalFilter(query, products);
      return res.status(200).json({ matchedIds, query, fallback: true });
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Parse AI response - extract JSON array
    let matchedIds = [];
    try {
      const jsonMatch = aiText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        matchedIds = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('Parse error:', parseErr, 'AI response:', aiText);
      // Fallback
      matchedIds = smartLocalFilter(query, products);
    }

    return res.status(200).json({ 
      matchedIds,
      query,
      totalProducts: products.length
    });

  } catch (err) {
    console.error('AI Search error:', err);
    // Fallback to local filter
    const matchedIds = smartLocalFilter(query, products);
    return res.status(200).json({ matchedIds, query, fallback: true });
  }
}

// Smart local filter as fallback
function smartLocalFilter(query, products) {
  const lowerQuery = query.toLowerCase();
  
  // Extract numbers with context (e.g., "3 tay", "2 ty")
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

  return products.filter(p => {
    const name = (p.name || '').toLowerCase();
    
    // Check tay requirement
    if (tayNum) {
      const productTay = name.match(/(\d+)\s*tay/);
      if (!productTay || productTay[1] !== tayNum) return false;
    }
    
    // Check ty requirement  
    if (tyNum) {
      const productTy = name.match(/(\d+)\s*(ty|xi\s*lanh|xylanh)/);
      if (!productTy || productTy[1] !== tyNum) return false;
    }
    
    // Check other keywords
    const hasKeywords = keywords.length === 0 || keywords.some(kw => name.includes(kw));
    
    return hasKeywords;
  }).map(p => p.id);
}
}
}
