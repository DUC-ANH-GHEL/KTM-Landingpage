// api/chat-ai.js

// Helper: build system prompt với danh sách sản phẩm
function buildSystemPrompt(products = []) {
  const productLines = (products || []).map((p) => {
    const codePart = p.code ? ` (mã ${p.code})` : "";
    const pricePart = p.price ? ` - giá ${p.price}` : " - chưa có giá";
    return `- ${p.name}${codePart}${pricePart}`;
  });

  return `
Bạn là trợ lý bán hàng AI cho Thủy Lực KTM - chuyên thiết bị thủy lực.

QUY TẮC BẮT BUỘC:
1. Trả lời 100% dựa trên danh sách sản phẩm bên dưới (KHÔNG bịa thêm sản phẩm / giá).
2. Nếu không tìm thấy chính xác, hãy gợi ý sản phẩm có tên TƯƠNG TỰ hoặc LIÊN QUAN.
3. Luôn trả lời ngắn gọn, dễ hiểu, bằng tiếng Việt.

KỸ NĂNG TÌM KIẾM THÔNG MINH:
- Hiểu từ viết tắt và từ không đầy đủ: "xy" = "xy lanh", "ben" = "ben thủy lực", "bơm" = có thể là "bơm tay" hoặc "bơm điện"
- Hiểu từ đồng nghĩa: "giá" = "bao nhiêu tiền", "mua" = "đặt hàng"
- Khi khách hỏi mơ hồ (vd: "xy" hoặc "van"), liệt kê TẤT CẢ sản phẩm có chứa từ đó.

CÁCH TRẢ LỜI:
- Hỏi giá 1 sản phẩm: trả lời rõ tên + giá.
- Hỏi tổng tiền nhiều sản phẩm: nêu từng sản phẩm + giá, rồi viết phép cộng.
- Nếu không tìm thấy: nói rõ "Không tìm thấy sản phẩm [X] trong danh sách. Có thể bạn muốn hỏi về [gợi ý]?"

NHỚ LỊCH SỬ CHAT:
- Dựa vào ngữ cảnh cuộc trò chuyện trước đó để hiểu câu hỏi hiện tại.
- Nếu khách nói "cái đó", "sản phẩm đó", "nó" → hiểu là sản phẩm vừa nhắc đến.
- Nếu khách nói "thêm cái này", "tổng lại" → cộng dồn với sản phẩm đã hỏi trước.

DANH SÁCH SẢN PHẨM:
${productLines.join('\n')}
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
    const { question, products, history } = req.body || {};
    if (!question) {
      return res.status(400).json({ error: 'Missing "question" in body' });
    }

    const systemPrompt = buildSystemPrompt(products || []);

    const MODEL = "gemini-2.0-flash";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    // Build contents với system prompt + lịch sử chat
    const contents = [];
    
    // System instruction (đưa vào tin nhắn đầu tiên)
    contents.push({
      role: "user",
      parts: [{ text: systemPrompt + "\n\nHãy trả lời theo hướng dẫn trên. Bắt đầu cuộc trò chuyện." }]
    });
    contents.push({
      role: "model",
      parts: [{ text: "Đã hiểu! Tôi là trợ lý bán hàng KTM, sẵn sàng hỗ trợ bạn về sản phẩm thủy lực." }]
    });

    // Thêm lịch sử chat (nếu có)
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.text }]
        });
      }
    }

    // Thêm câu hỏi hiện tại
    contents.push({
      role: "user",
      parts: [{ text: question }]
    });

    const body = {
      contents,
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
