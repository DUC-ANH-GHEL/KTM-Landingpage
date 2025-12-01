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
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const DISPLAY_LIMIT = 6;

  // Fallback data nếu API fail
  const fallbackFolders = [{
    id: 'fallback',
    name: 'Video hướng dẫn',
    videos: [
      { id: 1, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749269320/bao-gia-trang-gat-doc-lap_exzhpm.jpg", url: "https://www.youtube.com/embed/U9v6y7kIJ9A", title: "Báo giá trang gạt độc lập" },
      { id: 2, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749269576/bao-gia-trang-gat-tren-xoi_u9jocc.jpg", url: "https://www.youtube.com/embed/oLC34LfasrI", title: "Báo giá trang gạt trên xới" },
      { id: 3, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749277751/Trang-gat_fmkuqw.jpg", url: "https://www.youtube.com/embed/GEt7NB5GwIU", title: "Trang gạt" },
      { id: 4, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/youtube1_y63sbd.jpg", url: "https://www.youtube.com/embed/2MLY9YJrroU", title: "Hướng dẫn lắp đặt" },
      { id: 5, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/youtube4_ykmqip.jpg", url: "https://www.youtube.com/embed/x2TQKWooJEQ", title: "Video hướng dẫn 5" },
      { id: 6, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/youtube5_dy8uj1.jpg", url: "https://www.youtube.com/embed/_M6O7gCgdAc", title: "Video hướng dẫn 6" },
    ]
  }];

  useEffect(() => {
    const loadFolders = async () => {
      try {
        const res = await fetch('/api/video-folders?withVideos=true');
        if (res.ok) {
          const data = await res.json();
          // Filter out shorts folder
          const videoFolders = data.filter(f => f.slug !== 'shorts');
          if (videoFolders.length > 0) {
            setFolders(videoFolders);
          } else {
            setFolders(fallbackFolders);
          }
        } else {
          setFolders(fallbackFolders);
        }
      } catch (err) {
        console.error('Error loading video folders:', err);
        setFolders(fallbackFolders);
      }
      setLoading(false);
    };
    loadFolders();
  }, []);

  // Folder Grid View
  const renderFolderGrid = () => {
    const displayFolders = folders.slice(0, DISPLAY_LIMIT);
    const hasMore = folders.length > DISPLAY_LIMIT;

    return (
      <>
        <div className="row g-3 justify-content-center">
          {displayFolders.map((folder, i) => (
            <div key={folder.id || i} className="col-6 col-md-4 col-lg-3">
              <div 
                className="video-folder-card position-relative rounded overflow-hidden shadow"
                onClick={() => setSelectedFolder(folder)}
                style={{ cursor: 'pointer', aspectRatio: '16/9' }}
              >
                {/* Folder thumbnail - use first video thumb or default */}
                <img 
                  src={folder.coverImage || folder.videos?.[0]?.thumb || `https://img.youtube.com/vi/${folder.videos?.[0]?.youtubeId}/hqdefault.jpg` || 'https://via.placeholder.com/320x180?text=Video'} 
                  alt={folder.name}
                  className="w-100 h-100"
                  style={{ objectFit: 'cover' }}
                />
                <div className="position-absolute top-0 start-0 end-0 bottom-0" style={{ background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.8))' }}></div>
                <div className="position-absolute bottom-0 start-0 end-0 p-2 text-white">
                  <h6 className="mb-0 fw-bold">{folder.name}</h6>
                  <small className="opacity-75">
                    <i className="fas fa-video me-1"></i>
                    {folder.videos?.length || folder.videoCount || 0} video
                  </small>
                </div>
                <div className="position-absolute top-50 start-50 translate-middle">
                  <i className="fas fa-folder-open fa-2x text-warning"></i>
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="text-center mt-4">
            <button className="btn btn-outline-warning rounded-pill px-4">
              <i className="fas fa-th me-2"></i>
              Xem tất cả {folders.length} danh mục
            </button>
          </div>
        )}
      </>
    );
  };

  // Videos in Folder View
  const renderVideosInFolder = () => {
    const videos = selectedFolder.videos || [];
    const displayVideos = videos.slice(0, DISPLAY_LIMIT);
    const hasMore = videos.length > DISPLAY_LIMIT;

    return (
      <>
        {/* Back button */}
        <div className="d-flex align-items-center justify-content-center mb-4">
          <button 
            className="btn btn-outline-secondary me-3"
            onClick={() => setSelectedFolder(null)}
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <h4 className="mb-0">
            <i className="fas fa-folder-open text-warning me-2"></i>
            {selectedFolder.name}
          </h4>
        </div>

        <div className="row g-3">
          {displayVideos.map((v, i) => (
            <div key={v.id || i} className="col-6 col-md-4">
              <div 
                className="position-relative video-thumb rounded overflow-hidden shadow" 
                onClick={() => setActiveVideo(v.url)} 
                style={{ cursor: "pointer" }}
              >
                <img src={v.thumb} alt={v.title || `video ${i + 1}`} className="img-fluid w-100" style={{ aspectRatio: '16/9', objectFit: 'cover' }} />
                <div className="position-absolute top-50 start-50 translate-middle">
                  <i className="fas fa-play-circle fa-2x text-white"></i>
                </div>
                <div className="position-absolute bottom-0 start-0 end-0 p-2 text-white small" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                  {v.title || `Video ${i + 1}`}
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="text-center mt-4">
            <button 
              className="btn btn-warning rounded-pill px-4"
              onClick={() => setActiveVideo('showAll')}
            >
              <i className="fas fa-video me-2"></i>
              Xem tất cả {videos.length} video
            </button>
          </div>
        )}
      </>
    );
  };

  // All Videos Modal
  const renderAllVideosModal = () => {
    if (activeVideo !== 'showAll') return null;
    const videos = selectedFolder?.videos || [];

    return (
      <div className="modal-overlay-full" style={{ zIndex: 9998 }} onClick={() => setActiveVideo(null)}>
        <div className="container py-4" onClick={(e) => e.stopPropagation()}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="text-white mb-0">
              <i className="fas fa-folder-open me-2 text-warning"></i>
              {selectedFolder?.name} ({videos.length} video)
            </h3>
            <button className="btn btn-light" onClick={() => setActiveVideo(null)}>
              <i className="fas fa-times"></i> Đóng
            </button>
          </div>
          <div className="row g-3" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            {videos.map((v, i) => (
              <div key={v.id || i} className="col-6 col-md-4 col-lg-3">
                <div 
                  className="position-relative video-thumb bg-dark rounded overflow-hidden" 
                  onClick={() => setActiveVideo(v.url)}
                  style={{ cursor: "pointer" }}
                >
                  <img src={v.thumb} alt={v.title || `video ${i + 1}`} className="img-fluid w-100" style={{ aspectRatio: '16/9', objectFit: 'cover' }} />
                  <div className="position-absolute top-50 start-50 translate-middle">
                    <i className="fas fa-play-circle fa-2x text-white"></i>
                  </div>
                  <div className="position-absolute bottom-0 start-0 end-0 p-2 text-white small" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                    {v.title || `Video ${i + 1}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="py-5">
      <div className="container text-center">
        <h2 className="fw-bold mb-4">Video hướng dẫn</h2>
        
        {loading ? (
          <div className="py-4">
            <div className="spinner-border text-warning"></div>
          </div>
        ) : selectedFolder ? (
          renderVideosInFolder()
        ) : (
          renderFolderGrid()
        )}

        {/* Video Player Modal */}
        {activeVideo && activeVideo !== 'showAll' && (
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

        {/* All Videos Modal */}
        {renderAllVideosModal()}
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
  const { useRef, useEffect } = React;
  
  // Hardcoded shorts - không cần fetch từ API
  const shorts = [
    "UCreMHzob5c", "X7KeEUeH08s", "aRGJaryWCZM",
    "1jUJZ3JVYrE", "P4B9jBiCumw", "FEDQpcHVzEA",
    "sg45zTOzlr8", "VuPrPSkBtNE", "7aGK8dR8pK0"
  ];
  
  const containerRef = useRef(null);
  const iframeRefs = useRef([]);

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
  }, []);

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
