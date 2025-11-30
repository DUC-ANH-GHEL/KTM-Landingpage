// services/gemini.js - Gemini AI service

const fetch = require('node-fetch');
const { GEMINI_API_KEY, GEMINI_MODEL, GEMINI_API_URL } = require('../config');

/**
 * Build prompt từ câu hỏi và danh sách sản phẩm
 */
function buildPrompt(question, products = []) {
  const productLines = products.map((p) => {
    const codePart = p.code ? ` (mã ${p.code})` : '';
    const pricePart = p.price ? ` - giá ${p.price}` : ' - chưa có giá';
    return `- ${p.name}${codePart}${pricePart}`;
  });

  return `
Bạn là trợ lý bán hàng cho Thủy Lực KTM.

NHIỆM VỤ:
- Trả lời 100% dựa trên danh sách sản phẩm & giá bên dưới (KHÔNG bịa thêm sản phẩm / giá).
- Nếu khách hỏi giá 1 sản phẩm: trả lời rõ tên + giá.
- Nếu khách hỏi tổng tiền nhiều sản phẩm: 
  + Nêu rõ từng sản phẩm + giá.
  + Viết phép cộng (vd: 5.000.000đ + 7.300.000đ = 12.300.000đ).
- Nếu không tìm thấy sản phẩm trong danh sách: nói thẳng là hiện chưa có sản phẩm đó trong data.
- Luôn trả lời ngắn gọn, dễ hiểu, tiếng Việt.

DANH SÁCH SẢN PHẨM (tên + mã (nếu có) + giá):
${productLines.join('\n')}

CÂU HỎI CỦA KHÁCH: "${question}"
`.trim();
}

/**
 * Gọi Gemini API để lấy câu trả lời
 */
async function askGemini(question, products = []) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const prompt = buildPrompt(question, products);
  const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
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
  buildPrompt,
  askGemini
};
