// components/MediaComponents.js
// Chứa các component liên quan đến media: Video, Shorts, Reviews

function CustomerReviews({ innerRef }) {
  const reviews = [
    {
      name: "Nguyễn Văn Hùng",
      role: "Kỹ sư cơ khí",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      rating: 5,
      comment: "Sản phẩm chất lượng cao, lắp vừa máy, không rò rỉ dầu. Đã mua và sử dụng trong 6 tháng, rất hài lòng."
    },
    {
      name: "Trần Thị Mai",
      role: "Chủ xưởng cơ khí",
      avatar: "https://randomuser.me/api/portraits/women/45.jpg",
      rating: 5,
      comment: "Ty xy lanh KTM có độ bền cao, chịu áp lực tốt. Đội ngũ tư vấn nhiệt tình, giao hàng nhanh."
    },
    {
      name: "Phạm Văn Lợi",
      role: "Kỹ thuật viên",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      rating: 4,
      comment: "Sản phẩm tốt, giá cả hợp lý. Đã thay thế cho máy xúc đào và hoạt động ổn định trong điều kiện khắc nghiệt."
    }
  ];

  return (
    <section ref={innerRef} className="py-5 bg-light">
      <div className="container">
        <div className="text-center mb-5 fade-up">
          <h2 className="fw-bold">Khách hàng đánh giá</h2>
          <p className="text-muted">Những ý kiến từ khách hàng đã sử dụng sản phẩm</p>
        </div>

        <div className="row g-4">
          {reviews.map((review, index) => (
            <div key={index} className="col-md-4 fade-up" style={{ transitionDelay: `${0.1 * index}s` }}>
              <div className="customer-review card p-4 h-100">
                <div className="d-flex align-items-center mb-3">
                  <img src={review.avatar} alt={review.name} className="avatar me-3" />
                  <div>
                    <h5 className="mb-0">{review.name}</h5>
                    <p className="text-muted small mb-0">{review.role}</p>
                  </div>
                </div>
                <div className="mb-2">
                  {[...Array(5)].map((_, i) => (
                    <i
                      key={i}
                      className={`fas fa-star ${i < review.rating ? 'text-warning' : 'text-muted'}`}
                    ></i>
                  ))}
                </div>
                <p className="mb-0">{review.comment}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InstructionVideos() {
  const { useState, useEffect } = React;
  const [activeVideo, setActiveVideo] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback data nếu API fail
  const fallbackVideos = [
    { id: 1, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749269320/bao-gia-trang-gat-doc-lap_exzhpm.jpg", url: "https://www.youtube.com/embed/U9v6y7kIJ9A?si=LUUh8N05b5fhXo4I" },
    { id: 2, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749269576/bao-gia-trang-gat-tren-xoi_u9jocc.jpg", url: "https://www.youtube.com/embed/oLC34LfasrI?si=zDNi3tsbEh0d-nH7" },
    { id: 3, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749277751/Trang-gat_fmkuqw.jpg", url: "https://www.youtube.com/embed/GEt7NB5GwIU?si=yMh6SCJgKUckIEQy" },
    { id: 4, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/youtube1_y63sbd.jpg", url: "https://www.youtube.com/embed/2MLY9YJrroU?si=qvuJDHHp3bmNcIWY" },
    { id: 5, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/youtube4_ykmqip.jpg", url: "https://www.youtube.com/embed/x2TQKWooJEQ?si=n-cUkEEnpIqwx_iY" },
    { id: 6, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/youtube5_dy8uj1.jpg", url: "https://www.youtube.com/embed/_M6O7gCgdAc?si=nt8RATetDmGp5_3f" },
  ];

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const res = await fetch('/api/videos?category=instruction');
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setVideos(data);
          } else {
            setVideos(fallbackVideos);
          }
        } else {
          setVideos(fallbackVideos);
        }
      } catch (err) {
        console.error('Error loading videos:', err);
        setVideos(fallbackVideos);
      }
      setLoading(false);
    };
    loadVideos();
  }, []);

  return (
    <section className="py-5">
      <div className="container text-center">
        <h2 className="fw-bold mb-4">Video hướng dẫn</h2>
        {loading ? (
          <div className="py-4">
            <div className="spinner-border text-warning"></div>
          </div>
        ) : (
          <div className="row g-3">
            {videos.map((v, i) => (
              <div key={v.id || i} className="col-6 col-md-4">
                <div className="position-relative video-thumb" onClick={() => setActiveVideo(v.url)} style={{ cursor: "pointer" }}>
                  <img src={v.thumb} alt={v.title || `video ${i + 1}`} className="img-fluid rounded shadow" />
                  <div className="position-absolute top-50 start-50 translate-middle">
                    <i className="fas fa-play-circle fa-2x text-white"></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeVideo && (
          <div className="video-modal-overlay" onClick={() => setActiveVideo(null)}>
            <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="btn btn-light position-absolute top-0 end-0 m-2" onClick={() => setActiveVideo(null)}>
                &times;
              </button>
              <div className="ratio ratio-16x9">
                <iframe
                  src={activeVideo}
                  title="Video hướng dẫn"
                  frameBorder="0"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function YoutubeShortsSection({ onOpen }) {
  return (
    <section className="py-5 bg-dark text-white text-center">
      <div className="container">
        <div className="d-flex flex-column align-items-center">
          <div className="mb-3" style={{ maxWidth: 300, position: "relative" }} onClick={onOpen}>
            <img
              src="https://img.youtube.com/vi/UCreMHzob5c/hqdefault.jpg"
              alt="Video preview"
              className="img-fluid rounded shadow"
            />
            <div className="position-absolute top-50 start-50 translate-middle">
              <i className="fas fa-play-circle fa-3x text-white"></i>
            </div>
          </div>

          <h2 className="fw-bold mb-2">📹 Video ngắn - Mẹo máy nông nghiệp</h2>
          <p className="text-light small">
            Xem mẹo cực hay, lướt giống TikTok/Youtube Shorts
          </p>

          <button className="btn btn-danger mt-2 px-4 py-2 fw-semibold rounded-pill" onClick={onOpen}>
            ▶️ Bấm để xem ngay
          </button>
        </div>
      </div>
    </section>
  );
}

function YoutubeShortsModal({ onClose }) {
  const { useState, useEffect, useRef } = React;
  
  // Fallback shorts
  const fallbackShorts = [
    "UCreMHzob5c", "X7KeEUeH08s", "aRGJaryWCZM",
    "1jUJZ3JVYrE", "P4B9jBiCumw", "FEDQpcHVzEA",
    "sg45zTOzlr8", "VuPrPSkBtNE", "7aGK8dR8pK0"
  ];
  
  const [shorts, setShorts] = useState(fallbackShorts);
  const containerRef = useRef(null);
  const iframeRefs = useRef([]);

  useEffect(() => {
    const loadShorts = async () => {
      try {
        const res = await fetch('/api/videos?category=shorts');
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setShorts(data.map(v => v.youtubeId));
          }
        }
      } catch (err) {
        console.error('Error loading shorts:', err);
      }
    };
    loadShorts();
  }, []);

  const handleIntersection = (entries) => {
    entries.forEach((entry) => {
      const iframe = entry.target.querySelector("iframe");
      if (!iframe) return;

      const command = {
        event: "command",
        func: entry.isIntersecting ? "playVideo" : "pauseVideo",
        args: [],
      };
      iframe.contentWindow.postMessage(JSON.stringify(command), "*");
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, { threshold: 0.6 });
    const items = containerRef.current?.querySelectorAll(".short-item");
    items?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [shorts]);

  return (
    <div className="modal-overlay-full bg-black text-white" style={{ zIndex: 9999 }}>
      <button className="btn btn-light text-danger position-absolute top-0 end-0 m-3" onClick={onClose}>
        Tắt
      </button>
      <div
        className="shorts-container"
        ref={containerRef}
        style={{
          height: "100vh",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
        }}
      >
        {shorts.map((id, i) => (
          <div
            key={i}
            className="short-item"
            style={{
              height: "100vh",
              scrollSnapAlign: "start",
            }}
          >
            <iframe
              ref={(el) => (iframeRefs.current[i] = el)}
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${id}?enablejsapi=1&playsinline=1&mute=0&rel=0`}
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={`Short ${i}`}
            ></iframe>
          </div>
        ))}
      </div>
    </div>
  );
}
