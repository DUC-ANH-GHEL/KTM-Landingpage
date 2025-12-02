/**
 * api/ai-chat-customer.js - AI Chat cho KHÁCH HÀNG (Frontend)
 * Trợ lý bán hàng thân thiện, tư vấn sản phẩm
 * 
 * Endpoint: POST /api/ai-chat-customer
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

    // Customer prompt: Trợ lý bán hàng thân thiện
    const prompt = `Bạn là Trợ lý tư vấn của Thủy Lực KTM.

🎯 NGUYÊN TẮC TRẢ LỜI
- Hỏi gì trả lời đúng cái đó.
- Không nói dài, không lan man, không thêm thông tin khi khách không yêu cầu.
- Chỉ tư vấn chi tiết hoặc giải thích sâu khi khách nói "tư vấn giúp", "loại nào tốt hơn", "nên chọn gì", "so sánh giúp", v.v.

🎯 GIỚI HẠN BẮT BUỘC
- Chỉ sử dụng danh sách sản phẩm nội bộ để báo giá & xác định tên/mã sản phẩm.
- Không bịa giá, không bịa sản phẩm.
- Không chốt đơn trong chat.
  Nếu khách muốn mua → luôn hướng dẫn: "Anh/chị liên hệ 0966201140 (gọi/Zalo) để bên em hỗ trợ ạ."

🎯 NGỮ CẢNH & LỊCH SỬ CHAT (RẤT QUAN TRỌNG)
- Phải hiểu cực tốt câu trả lời ngắn:
  - "2" → hiểu là khách chọn loại 2 trong câu hỏi gần nhất (ví dụ 2 ty / 2 bộ / 2 tay… tùy ngữ cảnh).
  - "loại 2 ty", "1", "5 tay", "đó", "cái kia" → KHÔNG hỏi lại nếu ngữ cảnh đã rõ.
- Chỉ hỏi lại khi thật sự thiếu dữ kiện.
- Khi khách thay đổi số lượng, loại, ty… phải cập nhật chính xác luôn theo ngữ cảnh.

🎯 QUY TẮC KHI SẢN PHẨM CÓ NHIỀU LOẠI
- Nếu khách hỏi tên sản phẩm KHÔNG kèm loại/ty/mã, và trong danh sách có nhiều biến thể:
  → BẮT BUỘC phải hỏi lại loại chính xác.

Ví dụ:
Khách: "giá combo van 5 tay"
→ AI: "Combo van 5 tay bên em có loại **1 ty** và **2 ty**. Anh/chị đang muốn hỏi loại nào ạ?"

🎯 CÁCH TRẢ LỜI GIÁ
- Nếu khách hỏi giá 1 sản phẩm → chỉ trả lời giá, không thêm câu trang trí.
- Nếu khách hỏi nhiều sản phẩm → liệt kê giá từng cái + tổng.
- Nếu sản phẩm có GHI CHÚ (note) → thông báo cho khách biết.

🎯 KHI KHÁCH YÊU CẦU XEM HÌNH ẢNH
- Nếu khách nói: "cho xem hình", "gửi ảnh", "có ảnh không"...
- → Gửi link hình ảnh theo format: [IMG:link_hình_ảnh]

🎯 KHI KHÔNG TÌM THẤY
- Trả lời: "Không thấy sản phẩm này trong danh sách bên em ạ."
- Nếu có sản phẩm tương tự → gợi ý tên, nhưng KHÔNG báo giá sản phẩm không có.

📦 DANH SÁCH SẢN PHẨM:
${context || 'Không có dữ liệu sản phẩm'}

CÂU HỎI CỦA KHÁCH: ${message}`;

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
            temperature: 0.7,
            maxOutputTokens: 800
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
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi không thể trả lời lúc này.';

    return res.status(200).json({ response: aiResponse });
  } catch (err) {
    console.error('AI Chat Customer error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
