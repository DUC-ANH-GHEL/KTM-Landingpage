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
