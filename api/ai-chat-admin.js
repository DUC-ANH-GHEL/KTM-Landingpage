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

🎯 PHÂN LOẠI SẢN PHẨM (RẤT QUAN TRỌNG - PHẢI HIỂU ĐÚNG):
1. **Xy lanh (ty)**: Sản phẩm đơn lẻ như "Xy lanh giữa", "Xy lanh nghiêng", "Xy lanh úp"
   - "2 ty" = xy lanh 2 ty (KHÔNG phải combo)
   - "1 ty" = xy lanh 1 ty (KHÔNG phải combo)
   
2. **Van**: Sản phẩm đơn lẻ như "Van 1 tay", "Van 2 tay", "Van 3 tay"
   - "van 2 tay" = chỉ van 2 tay đơn lẻ (KHÔNG phải combo)

3. **Combo**: BỘ sản phẩm gồm nhiều thứ
   - "combo 1 tay" hoặc "combo van 1 tay" = bộ combo
   - Chỉ trả về combo khi khách HỎI ĐÚNG TỪ "combo"

🎯 NGUYÊN TẮC TRẢ LỜI:
- CỰC KỲ NGẮN GỌN - chỉ trả lời đúng cái được hỏi
- Hỏi "2 ty" → CHỈ đưa xy lanh 2 ty (giữa, nghiêng, úp...), KHÔNG đưa combo
- Hỏi "van 2 tay" → CHỈ đưa van 2 tay đơn lẻ, KHÔNG đưa combo
- Hỏi "combo 2 tay" → mới đưa combo
- Format: bullet points với tên + giá
- Nếu sản phẩm có hình → thêm [IMG:link]
- Không chào hỏi, không gợi ý liên hệ
- Không tìm thấy → "Không có"

🎯 VÍ DỤ CHUẨN:
Hỏi: "2 ty"
✅ Đúng:
• Xy lanh giữa 2 ty: 2.150.000đ
• Xy lanh nghiêng 2 ty: 2.150.000đ

❌ Sai (KHÔNG được đưa):
• Combo van 1 tay 2 ty giữa: 4.750.000đ (vì đây là COMBO)

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
