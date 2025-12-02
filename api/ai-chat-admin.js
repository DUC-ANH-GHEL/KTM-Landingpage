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

🎯 TỪ VIẾT TẮT (RẤT QUAN TRỌNG):
- "ty" = xy lanh (VD: "2 ty" = sản phẩm có "2 ty" trong tên)
- "1 ty", "2 ty" = loại xy lanh 1 ty hoặc 2 ty
- "van X tay" = van điều khiển X tay
- "combo" = bộ combo sản phẩm

🎯 NGUYÊN TẮC TRẢ LỜI:
1. CỰC KỲ NGẮN GỌN - chỉ trả lời đúng cái được hỏi
2. Khi hỏi "2 ty" → tìm TẤT CẢ sản phẩm có chứa "2 ty" trong tên và liệt kê kèm giá
3. Khi hỏi "van 2 tay" → liệt kê tất cả van 2 tay kèm giá
4. Format: dùng bullet points ngắn gọn
5. Không chào hỏi, không gợi ý liên hệ
6. Không tìm thấy → "Không có"

🎯 VÍ DỤ:
Hỏi: "2 ty"
Trả lời:
• Combo van 1 tay 2 ty giữa: 4.750.000đ
• Combo van 1 tay 2 ty nghiêng: 4.750.000đ
• Combo van 2 tay 2 ty nghiêng giữa: 7.300.000đ

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
