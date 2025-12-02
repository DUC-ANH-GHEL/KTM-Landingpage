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
   - "1 ty" hoặc "ty" = 1 cái xy lanh
   - "2 ty" = 2 cái xy lanh (giữa hoặc nghiêng)
   - Giá 1 ty: 1.950.000đ (không dây) hoặc 2.150.000đ (có dây)
   
2. **"ty giữa", "ty nghiêng", "ty ủi"** = LOẠI xy lanh cụ thể

3. **Van** = sản phẩm van điều khiển đơn lẻ

4. **Combo** = BỘ sản phẩm - CHỈ trả về khi hỏi đúng từ "combo"

🎯 CÁCH TÍNH GIÁ:
- "2 ty" → 1.950.000 × 2 = 3.900.000đ (không dây) / 2.150.000 × 2 = 4.300.000đ (có dây)
- "3 ty nghiêng" → 1.950.000 × 3 = 5.850.000đ

🎯 NGUYÊN TẮC TRẢ LỜI (BẮT BUỘC):
- CỰC KỲ NGẮN GỌN - chỉ text thuần
- KHÔNG đưa link hình ảnh, KHÔNG dùng [IMG:...]
- Tính toán số lượng × đơn giá
- Ghi rõ: không dây / có dây
- Không chào hỏi, không gợi ý liên hệ

🎯 VÍ DỤ CHUẨN:
Hỏi: "ty"
Trả lời:
Xy lanh (giữa/nghiêng): 1.950.000đ
(Có dây: 2.150.000đ)

Hỏi: "2 ty"
Trả lời:
2 xy lanh: 1.950.000 × 2 = 3.900.000đ
(Có dây: 2.150.000 × 2 = 4.300.000đ)

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
