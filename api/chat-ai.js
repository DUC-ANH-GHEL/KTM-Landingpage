// api/chat-ai.js

// Helper: build system prompt với danh sách sản phẩm
function buildSystemPrompt(products = []) {
  const productLines = (products || []).map((p) => {
    const codePart = p.code ? ` (mã ${p.code})` : "";
    const pricePart = p.price ? ` - giá ${p.price}` : " - chưa có giá";
    const notePart = p.note ? ` | Ghi chú: ${p.note}` : "";
    const imagePart = p.image ? ` | Hình: ${p.image}` : "";
    return `- ${p.name}${codePart}${pricePart}${notePart}${imagePart}`;
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

🎯 QUY TẮC BẮT BUỘC KHI SẢN PHẨM CÓ NHIỀU LOẠI / NHIỀU BIẾN THỂ
- Nếu khách hỏi tên sản phẩm KHÔNG kèm loại/ty/mã, và trong danh sách có nhiều biến thể giống nhau (ví dụ: van 5 tay 1 ty & van 5 tay 2 ty):
  → KHÔNG được tự suy đoán.
  → KHÔNG được tự chọn loại mặc định.
  → BẮT BUỘC phải hỏi lại loại chính xác.

⚠ Ví dụ:
Khách: "giá combo van 5 tay"
→ AI phải trả lời:
"Combo van 5 tay bên em có loại **1 ty** và **2 ty**.  
Anh/chị đang muốn hỏi loại nào ạ?"

⚠ Nếu khách trả lời ngắn:
- "2"
- "loại 2 ty"
- "2 ty"
→ AI phải hiểu đó là "combo van 5 tay loại 2 ty".

⚠ Nếu khách hỏi số lượng trước nhưng chưa nói loại:
- "giá 5 bộ combo van 5 tay"
→ AI phải hỏi lại loại trước khi tính:
"Combo van 5 tay có loại 1 ty và 2 ty.  
Anh/chị cần loại nào để em tính đúng giá ạ?"

🎯 CÁCH TRẢ LỜI GIÁ
- Nếu khách hỏi giá 1 sản phẩm → chỉ trả lời giá, không thêm câu trang trí.
- Nếu khách hỏi nhiều sản phẩm → liệt kê giá từng cái + viết phép cộng + tổng.
- Nếu sản phẩm có GHI CHÚ (note) → thông báo cho khách biết.
- Giữ nội dung ngắn, sạch, dễ đọc.

🎯 KHI KHÁCH YÊU CẦU XEM HÌNH ẢNH
- Nếu khách nói: "cho xem hình", "gửi ảnh", "hình sản phẩm", "xem hình được không", "có ảnh không"...
- Hoặc khách vừa hỏi giá xong và muốn xem hình sản phẩm đó
- → Gửi link hình ảnh theo format: [IMG:link_hình_ảnh]
- Ví dụ: Dưới đây là hình sản phẩm Van 1 tay ạ:
[IMG:https://res.cloudinary.com/diwxfpt92/image/upload/xxx.jpg]
- Chỉ gửi hình khi khách YÊU CẦU hoặc khi cần minh họa sản phẩm.
- Có thể gửi nhiều hình nếu khách hỏi nhiều sản phẩm.

🎯 KHI KHÔNG TÌM THẤY TRONG DATA
- Trả lời: "Không thấy sản phẩm này trong danh sách bên em ạ."
- Nếu có sản phẩm tương tự → gợi ý tên, nhưng KHÔNG báo giá sản phẩm không có.

🎯 KHI KHÁCH YÊU CẦU TƯ VẤN
- Lúc này mới được trả lời dài hơn.
- Giải thích ngắn, rõ ràng, đúng kỹ thuật.
- Không đưa giá sản phẩm ngoài danh sách.

📦 DANH SÁCH SẢN PHẨM NỘI BỘ (bao gồm tên, giá, ghi chú, và link hình):
${productLines.join('\n')}

Hãy luôn làm đúng các nguyên tắc trên.
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
