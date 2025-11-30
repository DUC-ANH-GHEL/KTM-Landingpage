// api/chat-ai.js

// Helper: build prompt từ products + question
function buildPrompt(question, products = []) {
  const productLines = (products || []).map((p) => {
    const codePart = p.code ? ` (mã ${p.code})` : "";
    const pricePart = p.price ? ` - giá ${p.price}` : " - chưa có giá";
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

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
  }

  try {
    const { question, products } = req.body || {};
    if (!question) {
      return res.status(400).json({ error: 'Missing "question" in body' });
    }

    const prompt = buildPrompt(question, products || []);

    const MODEL = "gemini-2.0-flash";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    const geminiRes = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return res.status(500).json({ error: "Gemini API error", detail: errText });
    }

    const data = await geminiRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("\n")
        .trim() || "Không nhận được phản hồi từ AI.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("/api/chat-ai error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
