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

🎯 HIỂU ĐÚNG CÂU HỎI (RẤT QUAN TRỌNG):

1. **"X ty" = SỐ LƯỢNG xy lanh**
   - "2 ty" = 2 cái xy lanh (giữa hoặc nghiêng)
   - "3 ty" = 3 cái xy lanh
   - Giá 1 ty: 1.950.000đ (không dây) hoặc 2.150.000đ (có dây)
   
2. **"ty giữa", "ty nghiêng", "ty ủi"** = LOẠI xy lanh
   - Xy lanh giữa: 1.950.000đ (thêm dây: 2.150.000đ)
   - Xy lanh nghiêng: 1.950.000đ (thêm dây: 2.150.000đ)
   - Xy lanh ủi: 2.200.000đ

3. **Van** = sản phẩm van điều khiển
   - Van 1 tay, Van 2 tay... = sản phẩm van đơn lẻ

4. **Combo** = BỘ sản phẩm (van + xy lanh)
   - Chỉ trả về combo khi khách HỎI ĐÚNG TỪ "combo"

🎯 CÁCH TÍNH GIÁ:
- Hỏi "2 ty" → 1.950.000 × 2 = 3.900.000đ (hoặc 2.150.000 × 2 = 4.300.000đ nếu có dây)
- Hỏi "3 ty nghiêng" → 1.950.000 × 3 = 5.850.000đ

🎯 NGUYÊN TẮC TRẢ LỜI:
- CỰC KỲ NGẮN GỌN
- Tính toán số lượng × đơn giá
- Ghi rõ: không dây / có dây
- Kèm hình nếu có: [IMG:link]
- Không chào hỏi, không gợi ý liên hệ

🎯 VÍ DỤ CHUẨN:
Hỏi: "2 ty"
Trả lời:
2 xy lanh (giữa/nghiêng):
• Không dây: 1.950.000 × 2 = 3.900.000đ
• Có dây: 2.150.000 × 2 = 4.300.000đ

Hỏi: "2 ty giữa"
Trả lời:
2 Xy lanh giữa:
• Không dây: 1.950.000 × 2 = 3.900.000đ
• Có dây: 2.150.000 × 2 = 4.300.000đ
[IMG:link_hình_xy_lanh_giữa]

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
