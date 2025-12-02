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

    const prompt = `Bạn là hệ thống tìm kiếm sản phẩm thủy lực KTM. Trả về CHÍNH XÁC sản phẩm phù hợp.

TÌM: "${query}"

SẢN PHẨM:
${productListText}

QUY TẮC QUAN TRỌNG:
- "X tay" nghĩa là CHÍNH XÁC X tay (VD: "3 tay" chỉ match "3 tay", KHÔNG match "2 tay" hay "4 tay")
- "X ty" hoặc "X xylanh" nghĩa là CHÍNH XÁC X xy lanh (VD: "2 ty" chỉ match "2 ty" hoặc "2 xylanh")
- Nếu tìm "3 tay 2 ty" → sản phẩm PHẢI có cả "3 tay" VÀ "2 ty/2 xylanh"
- KHÔNG trả về sản phẩm có số tay/ty khác với yêu cầu

VÍ DỤ:
- Tìm "2 ty 3 tay" → CHỈ lấy sản phẩm có "3 tay" VÀ ("2 ty" hoặc "2 xylanh")
- "Combo Van 3 tay + 2 xylanh" → ĐÚNG (3 tay, 2 xylanh)
- "Combo van 2 tay 2 ty" → SAI (2 tay, không phải 3 tay)

CHỈ TRẢ VỀ JSON ARRAY ID, KHÔNG GIẢI THÍCH:
Ví dụ: ["id1", "id2"]
Nếu không có sản phẩm nào phù hợp: []`;

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
  
  // Extract "X tay" - must be exact number
  const tayMatch = lowerQuery.match(/(\d+)\s*tay/);
  const tayNum = tayMatch ? tayMatch[1] : null;
  
  // Extract "X ty" or "X xylanh" or "X xi lanh"
  const tyMatch = lowerQuery.match(/(\d+)\s*(ty|xi\s*lanh|xylanh)/);
  const tyNum = tyMatch ? tyMatch[1] : null;
  
  // Other keywords (van, combo, nghieng, giua, etc.)
  const keywords = lowerQuery
    .replace(/\d+\s*tay/g, '')
    .replace(/\d+\s*(ty|xi\s*lanh|xylanh)/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !['van', 'combo'].includes(w)); // van/combo quá chung

  const filtered = products.filter(p => {
    const name = (p.name || '').toLowerCase();
    
    // STRICT check tay - must match exact number
    if (tayNum) {
      // Match patterns like "3 tay", "3tay", "Van 3 tay"
      const productTayMatch = name.match(/(\d+)\s*tay/);
      if (!productTayMatch || productTayMatch[1] !== tayNum) {
        return false;
      }
    }
    
    // STRICT check ty/xylanh - must match exact number
    if (tyNum) {
      // Match "2 ty", "2 xylanh", "2 xi lanh", "+ 2 xylanh"
      const productTyMatch = name.match(/(\d+)\s*(ty|xi\s*lanh|xylanh)/);
      if (!productTyMatch || productTyMatch[1] !== tyNum) {
        return false;
      }
    }
    
    // Check other specific keywords (nghieng, giua, ktm, etc.)
    if (keywords.length > 0) {
      return keywords.every(kw => name.includes(kw));
    }
    
    return true;
  });

  return filtered.map(p => p.id);
}
