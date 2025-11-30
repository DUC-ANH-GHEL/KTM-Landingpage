// components/AlbumGallery.js
// Component: Thư viện lắp đặt thực tế (Album Gallery)
// Tương thích với project React global (function components như các file hiện tại)

function AlbumGallery() {
  const { useState, useEffect, useRef } = React;

  // === DỮ LIỆU MẪU ===
  // Bạn thay/extend array này bởi dữ liệu thật (url, title, category, caption)
  const albums = [
    {
      id: "Yanmar-351",
      title: "Máy cày Yanmar 351",
      count: 8,
      cover: "https://www.yanmar.com/ltc/th/agri/products/tractor/ym351a_ym357a/img/6ea9f1742e/img_mainvisual_ym357a-l1_01_sp.jpg",
      images: [
        { src: "https://res.cloudinary.com/diwxfpt92/image/upload/v1764518195/yanmar-351-combo-3-tay-2-ty_cdxghj.jpg", caption: "Combo van 3 tay 2 ty" },
        // ...
      ]
    },
    
  ];

  // === STATE ===
  const [selectedAlbumId, setSelectedAlbumId] = useState(null); // null = show folder list, có value = show images
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [lightboxCaption, setLightboxCaption] = useState("");
  const [showModal, setShowModal] = useState(false); // show modal overlay
  const [filterText, setFilterText] = useState(""); // search within album

  useEffect(() => {
    // accessibility: esc to close lightbox or go back
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (lightboxSrc) {
          setLightboxSrc(null);
        } else if (selectedAlbumId) {
          setSelectedAlbumId(null); // go back to folder list
        } else {
          setShowModal(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc, selectedAlbumId]);

  // find current album object
  const currentAlbum = selectedAlbumId ? albums.find(a => a.id === selectedAlbumId) : null;

  // thumbnails to show on section: previews of other albums (cover)
  const previewAlbums = albums.slice(0, 4);

  // Layout: Masonry via CSS columns inside modal
  // Lazy loading for imgs via loading="lazy"

  // === RENDER ===
  return (
    <section className="album-gallery-section py-5 bg-white">
      <div className="container">
        <div className="mb-3">
          <h3 className="fw-bold">🔧 Thư viện lắp đặt thực tế</h3>
          <p className="text-muted small mb-0">Ảnh thật khách gửi — chọn theo loại máy hoặc sản phẩm. Click "Xem toàn bộ" để mở thư viện.</p>
        </div>

        {/* -- Thumbnails nhóm album (card ngoài trang) -- */}
        <div className="row g-3 align-items-stretch mb-3">
          {previewAlbums.map((alb) => (
            <div key={alb.id} className="col-6 col-md-3">
              <div className="card shadow-sm h-100 album-preview clickable" role="button" onClick={() => { setSelectedAlbumId(alb.id); setShowModal(true); }}>
                <div style={{ overflow: "hidden", height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={alb.cover} alt={alb.title} loading="lazy" className="img-fluid" style={{ maxHeight: "140px", objectFit: "cover", width: "100%" }} />
                </div>
                <div className="card-body py-2 px-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="small fw-semibold">{alb.title}</div>
                    <div className="badge bg-primary">{alb.images.length}</div>
                  </div>
                  <div className="small text-muted">Click để xem</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* -- Button xem toàn bộ album -- */}
        <div className="text-center mb-4">
          <button className="btn btn-success btn-lg" onClick={() => { setSelectedAlbumId(null); setShowModal(true); }}>
            <i className="fas fa-images me-2"></i> Xem toàn bộ album
          </button>
        </div>

        {/* -- Modal-like gallery (inline full-screen overlay) -- */}
        {showModal && (
          <div className="album-modal-overlay" role="dialog" aria-modal="true" aria-label="Thư viện hình ảnh">
            <div className="album-modal-content">
              
              {/* === VIEW: Folder List (khi chưa chọn album) === */}
              {!selectedAlbumId && (
                <>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h5 className="m-0"><i className="fas fa-folder-open me-2"></i>Chọn thư mục</h5>
                    <button className="btn btn-light btn-sm" onClick={() => { setShowModal(false); setLightboxSrc(null); }}>
                      <i className="fas fa-times"></i> Đóng
                    </button>
                  </div>
                  
                  <div className="row g-3">
                    {albums.map((alb) => (
                      <div key={alb.id} className="col-6 col-md-4">
                        <div className="card shadow-sm h-100 album-folder-card clickable" role="button" onClick={() => setSelectedAlbumId(alb.id)}>
                          <div style={{ overflow: "hidden", height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <img src={alb.cover} alt={alb.title} loading="lazy" className="img-fluid" style={{ maxHeight: "160px", objectFit: "cover", width: "100%" }} />
                          </div>
                          <div className="card-body py-2 px-3 text-center">
                            <div className="fw-semibold"><i className="fas fa-folder text-warning me-2"></i>{alb.title}</div>
                            <div className="small text-muted">{alb.images.length} ảnh</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* === VIEW: Images List (khi đã chọn album) === */}
              {selectedAlbumId && currentAlbum && (
                <>
                  <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => { setSelectedAlbumId(null); setFilterText(""); }}>
                        <i className="fas fa-arrow-left me-1"></i> Quay lại
                      </button>
                      <h5 className="m-0"><i className="fas fa-folder-open text-warning me-2"></i>{currentAlbum.title}</h5>
                      <small className="text-muted">({currentAlbum.images.length} ảnh)</small>
                    </div>
                    <button className="btn btn-light btn-sm" onClick={() => { setShowModal(false); setSelectedAlbumId(null); setLightboxSrc(null); setFilterText(""); }}>
                      <i className="fas fa-times"></i> Đóng
                    </button>
                  </div>

                  {/* Search input */}
                  <div className="mb-3">
                    <div className="input-group input-group-sm">
                      <span className="input-group-text"><i className="fas fa-search"></i></span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Tìm theo ghi chú (VD: L1501, van 3 tay...)"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                      />
                      {filterText && (
                        <button className="btn btn-outline-secondary" onClick={() => setFilterText("")}>
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="album-masonry">
                    {currentAlbum.images
                      .filter(img => {
                        if (!filterText) return true;
                        const q = filterText.toLowerCase();
                        return (img.caption || "").toLowerCase().includes(q);
                      })
                      .map((img, idx) => (
                      <div key={idx} className="album-masonry-item">
                        <img
                          src={img.src}
                          alt={img.caption || `${currentAlbum.title} ${idx + 1}`}
                          loading="lazy"
                          onClick={() => { setLightboxSrc(img.src); setLightboxCaption(img.caption || ""); }}
                          className="img-fluid rounded clickable"
                        />
                        <div className="caption small text-muted mt-1">{img.caption}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <div className="small text-muted">
                      Hiển thị {currentAlbum.images.filter(img => !filterText || (img.caption || "").toLowerCase().includes(filterText.toLowerCase())).length} / {currentAlbum.images.length} ảnh — Bộ sưu tập: {currentAlbum.title}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Lightbox sử dụng ImageModal component hiện có (nằm ở components/ImageModal.js) */}
            {lightboxSrc && typeof ImageModal === "function" ? (
              <ImageModal src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
            ) : lightboxSrc ? (
              // fallback simple modal
              <div className="image-fallback-modal" onClick={() => setLightboxSrc(null)}>
                <img src={lightboxSrc} alt={lightboxCaption} className="img-fluid rounded" />
                <button className="btn-close" onClick={() => setLightboxSrc(null)}>×</button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
