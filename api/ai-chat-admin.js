/**
 * api/ai-chat-admin.js - AI Chat cho ADMIN
 * Trợ lý tra cứu giá nhanh, ngắn gọn, đúng trọng tâm
 * 
 * Endpoint: POST /api/ai-chat-admin
 * Body: { message, context }
 */
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

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Admin prompt: Tra cứu nhanh cho chủ shop
    const prompt = `Bạn là trợ lý tra cứu giá nhanh cho chủ shop KTM.

📦 DANH SÁCH SẢN PHẨM:
${context || 'Không có dữ liệu'}

🎯 HIỂU ĐÚNG CÂU HỎI:

1. **Xy lanh (ty)**:
   - Xy lanh giữa: 1.950.000đ (có dây: 2.150.000đ)
   - Xy lanh nghiêng: 1.950.000đ (có dây: 2.150.000đ)
   - Xy lanh ủi: 2.200.000đ

2. **Van**: Van 1 tay, Van 2 tay... (sản phẩm đơn lẻ)

3. **Combo van X tay Y ty**: Bộ combo gồm van + xy lanh

🎯 NGUYÊN TẮC TRẢ LỜI:
- CỰC KỲ NGẮN GỌN
- Liệt kê từng sản phẩm + giá
- Nếu nhiều sản phẩm → LUÔN tính TỔNG ở cuối
- KHÔNG dùng [IMG:...]
- Không chào hỏi

🎯 VÍ DỤ:
Hỏi: "1 ty giữa với van 3 tay 2 ty"
Trả lời:
1. Xy lanh giữa: 1.950.000đ (có dây: 2.150.000đ)
2. Combo Van 3 tay + 2 xylanh: 7.800.000đ
→ Tổng không dây: 9.750.000đ
→ Tổng có dây: 9.950.000đ

Hỏi: "2 ty nghiêng với 1 ty giữa"
Trả lời:
1. 2 xy lanh nghiêng: 1.950.000 × 2 = 3.900.000đ
2. 1 xy lanh giữa: 1.950.000đ
→ Tổng không dây: 5.850.000đ
→ Tổng có dây: 6.450.000đ

CÂU HỎI: ${message}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      return res.status(500).json({ error: 'AI service error', detail: errorData });
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không tìm thấy.';

    return res.status(200).json({ response: aiResponse });
  } catch (err) {
    console.error('AI Chat Admin error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
