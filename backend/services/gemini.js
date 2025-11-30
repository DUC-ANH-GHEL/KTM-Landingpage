// services/gemini.js - Gemini AI service

const fetch = require('node-fetch');
const { GEMINI_API_KEY, GEMINI_MODEL, GEMINI_API_URL } = require('../config');

/**
 * Build system prompt với danh sách sản phẩm
 */
function buildSystemPrompt(products = []) {
  const productLines = products.map((p) => {
    const codePart = p.code ? ` (mã ${p.code})` : '';
    const pricePart = p.price ? ` - giá ${p.price}` : ' - chưa có giá';
    return `- ${p.name}${codePart}${pricePart}`;
  });

  return `
Bạn là Trợ lý tư vấn của Thủy Lực KTM.

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

🎯 CÁCH TRẢ LỜI GIÁ
- Nếu khách hỏi giá 1 sản phẩm → chỉ trả lời giá, không thêm câu trang trí.
- Nếu khách hỏi nhiều sản phẩm → liệt kê giá từng cái + viết phép cộng + tổng.
- Giữ nội dung ngắn, sạch, dễ đọc.

🎯 KHI KHÔNG TÌM THẤY TRONG DATA
- Trả lời: "Không thấy sản phẩm này trong danh sách bên em ạ."
- Nếu có sản phẩm tương tự → gợi ý tên, nhưng KHÔNG báo giá sản phẩm không có.

🎯 KHI KHÁCH YÊU CẦU TƯ VẤN
- Lúc này mới được trả lời dài hơn.
- Giải thích ngắn, rõ ràng, đúng kỹ thuật.
- Không đưa giá sản phẩm ngoài danh sách.

📦 DANH SÁCH SẢN PHẨM NỘI BỘ:
${productLines.join('\n')}

Hãy luôn làm đúng các nguyên tắc trên.
`.trim();
}

/**
 * Gọi Gemini API để lấy câu trả lời
 */
async function askGemini(question, products = [], history = []) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const systemPrompt = buildSystemPrompt(products);
  const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // Build contents với system prompt + lịch sử chat
  const contents = [];
  
  // System instruction
  contents.push({
    role: 'user',
    parts: [{ text: systemPrompt + '\n\nHãy trả lời theo hướng dẫn trên. Bắt đầu cuộc trò chuyện.' }]
  });
  contents.push({
    role: 'model',
    parts: [{ text: 'Đã hiểu! Tôi là trợ lý bán hàng KTM, sẵn sàng hỗ trợ bạn về sản phẩm thủy lực.' }]
  });

  // Thêm lịch sử chat (nếu có)
  if (history && Array.isArray(history)) {
    for (const msg of history) {
      contents.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      });
    }
  }

  // Thêm câu hỏi hiện tại
  contents.push({
    role: 'user',
    parts: [{ text: question }]
  });

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Gemini API error:', errText);
    throw new Error('Gemini API error');
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('\n')
    .trim();

  return reply || 'Không nhận được phản hồi từ AI.';
}

module.exports = {
  buildSystemPrompt,
  askGemini
};
