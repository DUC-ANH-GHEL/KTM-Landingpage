// api/ai-chat.js - AI Chat API với Gemini
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

    const prompt = `Bạn là trợ lý bán hàng của KTM - chuyên về thiết bị thủy lực, xy lanh, van tay, combo sản phẩm cho máy nông nghiệp.

DANH SÁCH SẢN PHẨM VÀ GIÁ:
${context || 'Không có dữ liệu sản phẩm'}

QUY TẮC TRẢ LỜI:
1. Trả lời ngắn gọn, đúng trọng tâm
2. Nếu hỏi về giá, trả lời chính xác giá từ danh sách
3. Nếu hỏi combo, gợi ý combo phù hợp với nhu cầu
4. Nếu không có thông tin, nói "Tôi không có thông tin về sản phẩm này"
5. Luôn thân thiện và sẵn sàng hỗ trợ
6. Nếu sản phẩm có ghi chú (note) thì đề cập

CÂU HỎI CỦA KHÁCH: ${message}`;

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
            temperature: 0.7,
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
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi không thể trả lời lúc này.';

    return res.status(200).json({ response: aiResponse });
  } catch (err) {
    console.error('AI Chat error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
