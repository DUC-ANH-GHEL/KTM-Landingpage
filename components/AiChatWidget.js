// components/AiChatWidget.js
// Widget chat AI dùng Gemini + data từ SEARCH_PRODUCTS

// Gọi backend Vercel serverless để chat AI
async function callGeminiWithProducts(question, chatHistory = []) {
  // Local: http://localhost:4000/api/chat-ai
  // Production: /api/chat-ai
//   const API_URL = "http://localhost:4000/api/chat-ai";
  const API_URL = "/api/chat-ai";

  const payload = {
    question,
    products: SEARCH_PRODUCTS,
    history: chatHistory
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Backend /api/chat-ai error:", errText);
    throw new Error("Backend API error");
  }

  const data = await res.json();
  return data.reply || "Không nhận được phản hồi từ AI.";
}

// Component hiển thị nội dung tin nhắn (hỗ trợ hình ảnh)
function MessageContent({ text }) {
  const { useState } = React;
  const [lightboxImg, setLightboxImg] = useState(null);

  // Parse text để tìm [IMG:url] và render thành hình ảnh
  const parseContent = (content) => {
    const parts = [];
    const imgRegex = /\[IMG:(https?:\/\/[^\]]+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = imgRegex.exec(content)) !== null) {
      // Text trước hình
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index);
        parts.push({ type: 'text', content: textBefore });
      }
      // Hình ảnh
      parts.push({ type: 'image', url: match[1] });
      lastIndex = match.index + match[0].length;
    }

    // Text còn lại
    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return parts;
  };

  const parts = parseContent(text);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.type === 'image') {
          return (
            <div key={idx} className="ai-chat-image-container my-2">
              <img
                src={part.url}
                alt="Hình sản phẩm"
                className="ai-chat-image"
                onClick={() => setLightboxImg(part.url)}
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  objectFit: 'cover',
                  border: '1px solid #ddd'
                }}
              />
            </div>
          );
        }
        // Text
        return part.content.split("\n").map((line, i) => (
          <p key={`${idx}-${i}`} className="mb-1">{line}</p>
        ));
      })}

      {/* Lightbox */}
      {lightboxImg && ReactDOM.createPortal(
        <div
          className="ai-chat-lightbox"
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2147483647,
            cursor: 'zoom-out'
          }}
        >
          <img
            src={lightboxImg}
            alt="Xem hình lớn"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
          <button
            onClick={() => setLightboxImg(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

function AiChatWidget({ onClose }) {
  const { useState, useEffect, useRef } = React;
  
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Chào bạn, mình là trợ lý KTM AI 🤖\n\nBạn có thể hỏi:\n• Giá sản phẩm: 'van 1 tay giá bao nhiêu'\n• Tính tổng: 'tổng 3 combo này hết bao nhiêu'\n• So sánh: 'so sánh combo van 2 tay và 3 tay'\n• Xem hình: 'cho xem hình van 1 tay'"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Tự kéo xuống cuối mỗi khi có tin nhắn mới
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question) return;

    const newMessages = [...messages, { role: "user", text: question }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Gửi kèm lịch sử chat (bỏ tin nhắn đầu tiên - greeting)
      const historyToSend = newMessages.slice(1).map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        text: m.text
      }));
      const reply = await callGeminiWithProducts(question, historyToSend);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "Xin lỗi, hệ thống AI đang gặp lỗi hoặc chưa cấu hình API key Gemini. Vui lòng kiểm tra lại."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-chat-widget shadow-lg">
      <div className="ai-chat-header d-flex justify-content-between align-items-center px-3 py-2">
        <div className="d-flex align-items-center gap-2">
          <span className="ai-chat-avatar">
            <i className="fas fa-robot"></i>
          </span>
          <div className="d-flex flex-column">
            <span className="fw-semibold">Bá Đức AI</span>
            <small className="text-light">Hỏi gì về giá KTM cũng được</small>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-light px-2 py-0"
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="ai-chat-body px-3 py-2">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`ai-chat-message ${
              m.role === "assistant" ? "ai-chat-message-assistant" : "ai-chat-message-user"
            }`}
          >
            <div className="ai-chat-bubble">
              <MessageContent text={m.text} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="ai-chat-message ai-chat-message-assistant">
            <div className="ai-chat-bubble">
              <span>AI đang trả lời...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input px-2 py-2 border-top">
        <div className="input-group input-group-sm">
          <textarea
            rows={2}
            className="form-control"
            placeholder="Nhập câu hỏi (vd: tổng 3 combo này bao nhiêu tiền?)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="btn btn-primary"
            type="button"
            disabled={loading}
            onClick={handleSend}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
