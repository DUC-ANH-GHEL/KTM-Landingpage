// components/MiniGame.js
// Chứa MiniGameModal, SlotMachine, ScratchCard, LuckyWheel, MemoryMatchGame, PuzzleBoard

const { useState, useEffect, useRef } = React;

function MiniGameModal() {
  const [step, setStep] = useState(0); // 0: intro, 1: form, 2: puzzle, 3: scratch, 4: share
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [scratchDone, setScratchDone] = useState(false);
  const discountCodes = ["KM10%", "KM5%", "FREESHIP", "QUA-TANG", "SALE2025", "VIP2025", "CODE123", "GIAMGIA7"];

  useEffect(() => {
    const timer = setTimeout(() => setStep(0), 1500);
    return () => clearTimeout(timer);
  }, []);

  const validatePhone = (phone) => /^0\d{9}$/.test(phone.trim());

  const handleFormSubmit = () => {
    handlePuzzleComplete();
    const { name, phone } = formData;
    if (!name || !phone) return setError("Vui lòng nhập đủ thông tin");
    if (!validatePhone(phone)) return setError("Số điện thoại không hợp lệ");
    setError("");
    setStep(2);
  };

  const getRandomCode = () => {
    return discountCodes[Math.floor(Math.random() * discountCodes.length)];
  };

  const handlePuzzleComplete = () => {
    const random = getRandomCode();
    setCode(random);
    setStep(3);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setStep(4);
  };

  return (
    step !== null && (
      <div className="modal-overlay-full">
        <canvas
          id="confetti-canvas"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        ></canvas>
        <div className="modal-box p-4 bg-white rounded shadow position-relative">
          <button className="btn-sm btn-danger position-absolute top-0 end-0 button-close-margin" onClick={() => setStep(null)}>&times;</button>

          {step === 0 && (
            <div className="text-center">
              <h4 className="fw-bold">🎉 Xin chúc mừng bạn được tham gia mini game</h4>
              <p>Quay trúng thưởng – Nhận ngay mã giảm giá hấp dẫn</p>
              <button className="btn btn-primary" onClick={() => setStep(1)}>Chơi ngay</button>
            </div>
          )}

          {step === 1 && (
            <div>
              <h5 className="mb-3">Xác thực thông tin</h5>
              <input className="form-control mb-2" placeholder="Họ tên" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              <input className="form-control mb-2" placeholder="Số điện thoại" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              {error && <div className="text-danger small mb-2">{error}</div>}
              <button className="btn btn-success w-100" onClick={handleFormSubmit}>Bắt đầu chơi</button>
            </div>
          )}

          {step === 2 && (
            <SlotMachine setStep={setStep} formData={formData} />
          )}

          {step === 3 && (
            <ScratchCard code={code} onDone={() => setScratchDone(true)} />
          )}

          {step === 3 && scratchDone && (
            <div className="text-center mt-3">
              <p className="fw-bold">🎁 Mã của bạn: <span className="text-success">{code}</span></p>
              <button className="btn btn-primary" onClick={handleCopy}>Sao chép mã</button>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <h5>✅ Hoàn tất</h5>
              <p>Cảm ơn bạn! Hãy chia sẻ để nhận thêm quà</p>
              <div className="d-flex justify-content-center gap-2 mt-3">
                <a href="https://facebook.com/sharer/sharer.php" target="_blank" className="btn btn-sm btn-primary">Facebook</a>
                <a href="https://zalo.me/share" target="_blank" className="btn btn-sm btn-success">Zalo</a>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  );
}

function SlotMachine({ setStep, formData }) {
  const [spinning, setSpinning] = React.useState(false);
  const [slots, setSlots] = React.useState(["", "", ""]);
  const [result, setResult] = React.useState(null);
  const [spinsUsed, setSpinsUsed] = React.useState(0);
  const [bonusClaimed, setBonusClaimed] = React.useState({
    fb: false,
    tiktok: false,
    youtube: false,
  });

  const totalSpins = 6;
  const freeSpins = 3;
  const bonusUnlocked =
    (bonusClaimed.fb ? 1 : 0) +
    (bonusClaimed.tiktok ? 1 : 0) +
    (bonusClaimed.youtube ? 1 : 0);
  const availableSpins = Math.min(totalSpins, freeSpins + bonusUnlocked);
  const spinsLeft = Math.max(0, availableSpins - spinsUsed);

  const images = [
    { name: "🍎", image: "1.jpg", prize: "Giảm 50K phí vận chuyển" },
    { name: "🍋", image: "51.jpg", prize: "Giảm 100K phí vận chuyển" },
    { name: "🍉", image: "van1.png", prize: "Giảm 150K phí vận chuyển" },
    { name: "🍇", image: "van2.png", prize: "Giảm 200K phí vận chuyển" },
    { name: "😄", image: "61.jpg", prize: "Giảm 250K phí vận chuyển" },
    { name: "☎️", image: "71.jpg", prize: "Giảm 300K phí vận chuyển" },
  ];

  const handleSpinResult = async (forceWin) => {
    let final;
    if (forceWin) {
      const chosen = images[Math.floor(Math.random() * images.length)];
      final = [chosen, chosen, chosen];
    } else {
      const shuffled = images.sort(() => 0.5 - Math.random());
      final = [shuffled[0], shuffled[1], shuffled[2]];
    }

    setSlots(final);
    setSpinsUsed((prev) => prev + 1);
    setSpinning(false);

    if (final[0].name === final[1].name && final[1].name === final[2].name) {
      const gift = final[0].prize;
      setResult(`🎉 Xin chúc mừng bạn đã trúng: ${gift}! Vui lòng liên hệ fb hoặc zalo để nhận thưởng nhé bạn`);

      const canvas = document.getElementById("confetti-canvas");
      if (canvas && typeof confetti !== 'undefined') {
        const confettiInstance = confetti.create(canvas, { resize: true, useWorker: true });
        for (let i = 0; i < 25; i++) {
          setTimeout(() => {
            confettiInstance({
              particleCount: 100,
              spread: 70,
              origin: { x: Math.random(), y: Math.random() * 0.6 }
            });
          }, i * 1000);
        }
      }

      try {
        await fetch("https://sheetdb.io/api/v1/br3yxz6v6al06", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              Name: formData.name,
              Phone: formData.phone,
              Gift: gift,
            },
          }),
        });
      } catch (error) {
        console.error("Lỗi khi lưu vào sheet:", error);
      }

      setTimeout(() => setStep(null), 25000);
    } else {
      setResult("💔 Không trúng thưởng, thử lại nhé!");
    }
  };

  const spin = () => {
    if (spinning || spinsLeft <= 0) return;

    setSpinning(true);
    setResult(null);

    const isLastSpin = spinsUsed === totalSpins - 1;

    const interval = setInterval(() => {
      const temp = Array(3)
        .fill()
        .map(() => images[Math.floor(Math.random() * images.length)]);
      setSlots(temp);

      if (Math.random() < 0.05 || isLastSpin) {
        clearInterval(interval);
        handleSpinResult(isLastSpin);
      }
    }, 100);
  };

  const claimBonus = (platform) => {
    if (bonusClaimed[platform]) return;

    setBonusClaimed((prev) => ({ ...prev, [platform]: true }));

    const links = {
      fb: "https://facebook.com/profile.php?id=61574648098644",
      tiktok: "https://www.tiktok.com/@nongcubaduc",
      youtube: "https://www.youtube.com/@nongcubaduc",
    };
    window.open(links[platform], "_blank");
  };

  return (
    <div className="text-center my-5">
      <h4 className="mb-3">🎰 Quay số may mắn</h4>
      <p className="text-muted">
        Lượt quay còn lại: <strong>{spinsLeft}</strong>/3
      </p>

      <div className="d-flex justify-content-center align-items-center gap-3 mb-3">
        {slots.map((slot, idx) => (
          <div
            key={idx}
            className="border p-2 rounded shadow"
            style={{ width: 80, height: 80, background: "#fff" }}
          >
            {slot && (
              <img
                src={slot.image}
                alt={slot.name}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            )}
          </div>
        ))}
      </div>

      <button
        className="btn btn-danger px-4"
        onClick={spin}
        disabled={spinning || spinsLeft <= 0}
      >
        {spinning ? "Đang quay..." : "Quay số"}
      </button>

      {result && <p className="mt-3 fw-bold text-success">{result}</p>}

      {spinsUsed >= freeSpins && availableSpins < totalSpins && (
        <div className="mt-4">
          <p>
            <strong>Hết lượt quay miễn phí.</strong> Hãy theo dõi để nhận thêm lượt:
          </p>
          <div className="d-flex justify-content-center gap-3">
            {!bonusClaimed.fb && (
              <button className="btn btn-outline-primary" onClick={() => claimBonus("fb")}>
                <i className="fab fa-facebook"></i> Facebook
              </button>
            )}
            {!bonusClaimed.youtube && (
              <button className="btn btn-outline-danger" onClick={() => claimBonus("youtube")}>
                <i className="fab fa-youtube"></i> YouTube
              </button>
            )}
            {!bonusClaimed.tiktok && (
              <button className="btn btn-outline-dark" onClick={() => claimBonus("tiktok")}>
                <i className="fab fa-tiktok"></i> TikTok
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ScratchCard({ code, onDone }) {
  const canvasRef = React.useRef(null);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = "#ccc";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "destination-out";

    const draw = (x, y) => {
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
    };

    let isDrawing = false;

    const handleMove = (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      draw(x, y);
    };

    canvas.addEventListener("mousedown", () => (isDrawing = true));
    canvas.addEventListener("mouseup", () => (isDrawing = false));
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("touchstart", () => (isDrawing = true));
    canvas.addEventListener("touchend", () => (isDrawing = false));
    canvas.addEventListener("touchmove", handleMove);

    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("touchmove", handleMove);
    };
  }, []);

  return (
    <div className="text-center">
      <h5 className="mb-3">🎁 Cào để nhận mã khuyến mãi</h5>
      <div
        ref={containerRef}
        style={{
          width: 280,
          height: 120,
          position: "relative",
          margin: "0 auto",
        }}
      >
        <div
          className="position-absolute top-50 start-50 translate-middle fw-bold fs-4 z-1 text-dark"
          style={{ zIndex: 1 }}
        >
          {code}
        </div>
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            borderRadius: 8,
            width: "100%",
            height: "100%",
            zIndex: 2,
          }}
        />
      </div>
      <button
        className="btn btn-outline-success mt-3"
        onClick={() => {
          navigator.clipboard.writeText(code);
          onDone();
        }}
      >
        Sao chép mã
      </button>
    </div>
  );
}

function LuckyWheel() {
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [rotation, setRotation] = React.useState(0);
  const [prizeIndex, setPrizeIndex] = React.useState(null);
  const [result, setResult] = React.useState(null);

  const prizes = [
    { label: "Giảm 10%", color: "#f44336" },
    { label: "Freeship", color: "#2196f3" },
    { label: "Voucher 50k", color: "#ff9800" },
    { label: "Không trúng", color: "#9e9e9e" },
    { label: "Tặng quà", color: "#4caf50" },
    { label: "Giảm 5%", color: "#e91e63" }
  ];

  const radius = 150;
  const anglePerSlice = 360 / prizes.length;

  const spinWheel = () => {
    if (isSpinning) return;

    const newIndex = getRandomIndexWithWeight(prizes.length);

    const sliceCenterAngle = newIndex * anglePerSlice + anglePerSlice / 2;
    const baseAngle = 270;
    const totalRotation = 360 * 5 + (baseAngle - sliceCenterAngle);

    setPrizeIndex(newIndex);
    setRotation((prev) => prev + totalRotation);
    setIsSpinning(true);

    setTimeout(() => {
      setResult(prizes[newIndex].label);
      setIsSpinning(false);
    }, 4000);
  };

  const getRandomIndexWithWeight = (length) => {
    const weights = [2, 10, 1, 1, 2, 1];
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      if (r < weights[i]) return i;
      r -= weights[i];
    }
    return 0;
  };

  return (
    <div className="text-center">
      <h4 className="mb-3">🎡 Vòng quay may mắn</h4>
      <div className="position-relative d-inline-block" style={{ width: radius * 2, height: radius * 2 }}>
        <svg
          width={radius * 2}
          height={radius * 2}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? "transform 4s ease-out" : "none",
          }}
        >
          {prizes.map((p, i) => {
            const startAngle = anglePerSlice * i;
            const endAngle = anglePerSlice * (i + 1);
            const x1 = radius + radius * Math.cos((Math.PI * startAngle) / 180);
            const y1 = radius + radius * Math.sin((Math.PI * startAngle) / 180);
            const x2 = radius + radius * Math.cos((Math.PI * endAngle) / 180);
            const y2 = radius + radius * Math.sin((Math.PI * endAngle) / 180);

            const largeArcFlag = anglePerSlice > 180 ? 1 : 0;

            const path = `
              M ${radius} ${radius}
              L ${x1} ${y1}
              A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
              Z
            `;

            const textAngle = startAngle + anglePerSlice / 2;
            const textX = radius + (radius / 1.8) * Math.cos((Math.PI * textAngle) / 180);
            const textY = radius + (radius / 1.8) * Math.sin((Math.PI * textAngle) / 180);

            return (
              <g key={i}>
                <path d={path} fill={p.color}></path>
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize="14"
                  transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        <div
          className="position-absolute start-50 translate-middle-x"
          style={{
            top: "-20px",
            width: 0,
            height: 0,
            borderLeft: "15px solid transparent",
            borderRight: "15px solid transparent",
            borderTop: "30px solid black",
            zIndex: 10,
          }}
        ></div>
      </div>

      <button className="btn btn-danger mt-4" onClick={spinWheel} disabled={isSpinning}>
        {isSpinning ? "Đang quay..." : "Quay ngay"}
      </button>

      {result && (
        <div className="alert alert-success mt-3">
          🎉 <strong>Bạn nhận được:</strong> <span className="text-primary">{result}</span>
        </div>
      )}
    </div>
  );
}

function MemoryMatchGame({ onWin }) {
  const images = [
    "van1.png", "van2.png", "van3.png", "1.jpg",
    "van4.png", "3.jpg", "51.jpg", "61.jpg"
  ];
  const [cards, setCards] = React.useState([]);
  const [flipped, setFlipped] = React.useState([]);
  const [matched, setMatched] = React.useState([]);
  const [turns, setTurns] = React.useState(0);

  React.useEffect(() => {
    const doubled = [...images, ...images];
    const shuffled = doubled.sort(() => 0.5 - Math.random()).map((img, i) => ({ id: i, img }));
    setCards(shuffled);
  }, []);

  React.useEffect(() => {
    if (flipped.length === 2) {
      const [first, second] = flipped;
      if (cards[first].img === cards[second].img) {
        setMatched([...matched, cards[first].img]);
        setFlipped([]);
        if (matched.length + 1 === images.length) {
          setTimeout(() => onWin(), 800);
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
      setTurns(t => t + 1);
    }
  }, [flipped]);

  const handleFlip = (idx) => {
    if (flipped.length < 2 && !flipped.includes(idx) && !matched.includes(cards[idx].img)) {
      setFlipped([...flipped, idx]);
    }
  };

  return (
    <div className="text-center">
      <h5 className="mb-3">🧠 Memory Match – Tìm 2 thẻ giống nhau để nhận mã ưu đãi</h5>
      <div className="row row-cols-4 g-2 justify-content-center" style={{ maxWidth: "400px", margin: "0 auto" }}>
        {cards.map((card, idx) => {
          const isFlipped = flipped.includes(idx) || matched.includes(card.img);
          return (
            <div key={card.id} className="col">
              <div
                className="memory-card border rounded"
                style={{
                  width: "70px",
                  height: "70px",
                  background: "#eee",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onClick={() => handleFlip(idx)}
              >
                {isFlipped ? <img src={card.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "❓"}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 small">Lượt chơi: {turns}</p>
    </div>
  );
}

function PuzzleBoard({ image, onComplete }) {
  const size = 3;
  const [tiles, setTiles] = React.useState([]);
  const [blankIndex, setBlankIndex] = React.useState(size * size - 1);

  React.useEffect(() => {
    const initial = [...Array(size * size).keys()];
    const shuffled = shuffle(initial);
    setTiles(shuffled);
    setBlankIndex(shuffled.indexOf(size * size - 1));
  }, []);

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const swap = (i) => {
    const newTiles = [...tiles];
    [newTiles[i], newTiles[blankIndex]] = [newTiles[blankIndex], newTiles[i]];
    setTiles(newTiles);
    setBlankIndex(i);
    if (newTiles.every((val, idx) => val === idx)) {
      setTimeout(() => onComplete(), 500);
    }
  };

  const canMove = (i) => {
    const r = Math.floor(i / size), c = i % size;
    const br = Math.floor(blankIndex / size), bc = blankIndex % size;
    return Math.abs(r - br) + Math.abs(c - bc) === 1;
  };

  return (
    <div className="text-center">
      <h5 className="mb-3">🧩 Xếp hình hoàn chỉnh để nhận ưu đãi</h5>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, 80px)`,
          gap: '2px',
          justifyContent: 'center'
        }}
      >
        {tiles.map((tile, i) => (
          <div
            key={i}
            onClick={() => canMove(i) && swap(i)}
            style={{
              width: 80,
              height: 80,
              backgroundColor: tile === size * size - 1 ? "#eee" : "transparent",
              backgroundImage: tile === size * size - 1 ? "none" : `url(${image})`,
              backgroundSize: `${size * 80}px ${size * 80}px`,
              backgroundPosition: `${-(tile % size) * 80}px ${-Math.floor(tile / size) * 80}px`,
              border: '1px solid #ccc',
              cursor: canMove(i) ? 'pointer' : 'default',
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}
