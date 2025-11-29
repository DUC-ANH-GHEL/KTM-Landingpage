// app.js
const { useState, useEffect, useRef } = React;





// ================== THANH SEARCH TỔNG CHO TOÀN TRANG ==================
function GlobalSearchBar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  // prevent immediate re-opening of suggestions after selecting an item
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);

  const inputRef = useRef(null);

  // Hàm bỏ dấu tiếng Việt
  const removeAccents = (str = "") =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const handleChange = (e) => {
    setSearchTerm(e.target.value);
    setSelectedIndex(-1);
    setSelectedProduct(null);
    // typing should cancel any temporary suppression
    setSuppressSuggestions(false);
  };

  // Debounced suggestion computation (reactive to searchTerm)
  useEffect(() => {
    const minLen = 1; // allow 1+ chars for partial matches
    if (suppressSuggestions) return; // if we just selected an item, skip producing suggestions
    if (!searchTerm || searchTerm.trim().length < minLen) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const handler = setTimeout(() => {
      const normalizedQuery = removeAccents(searchTerm.trim());
      const keywords = normalizedQuery.split(/\s+/).filter(Boolean);

      const results = SEARCH_PRODUCTS.filter((prod) => {
        const searchable = removeAccents(
          `${prod.name} ${prod.code || ""} ${prod.category || ""}`
        );

        if (keywords.length === 1) return searchable.includes(keywords[0]);
        return keywords.every((kw) => searchable.includes(kw));
      }).slice(0, 8);

      // debug removed
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 120);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // compute fixed position for dropdown so it sits above other sections (hero) and doesn't get covered
  useEffect(() => {
    if (!inputRef.current || suggestions.length === 0) {
      setDropdownStyle({});
      return;
    }

    const updatePos = () => {
      const rect = inputRef.current.getBoundingClientRect();
      // place directly under input (viewport coords)
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 999999
      });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, { passive: true });

    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos);
    };
  }, [suggestions]);

  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    setSearchTerm(prod.name);
    setShowSuggestions(false);
    // also clear suggestions so the dropdown stops rendering instantly
    setSuggestions([]);
    // prevent the suggestions useEffect from re-populating immediately after setting searchTerm
    setSuppressSuggestions(true);
    setTimeout(() => setSuppressSuggestions(false), 300);
    setSelectedIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0) handleSelectProduct(suggestions[selectedIndex]);
      else if (suggestions.length === 1) handleSelectProduct(suggestions[0]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleBlur = () => setTimeout(() => setShowSuggestions(false), 150);
  const handleFocus = () => suggestions.length > 0 && setShowSuggestions(true);

  const clearSearch = () => {
    setSearchTerm("");
    setSuggestions([]);
    setSelectedProduct(null);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <section className="py-3 bg-light border-bottom global-search-bar-section">
      <div className="container global-search-container" >
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8 search-wrapper">
            <label className="form-label fw-semibold mb-2 d-flex align-items-center">
              <i className="fas fa-search me-2 text-primary"></i>
              Tìm nhanh giá sản phẩm KTM
            </label>
            <div className="input-group position-relative">
              <span className="input-group-text">
                <i className="fas fa-search text-primary"></i>
              </span>
              <input
                ref={inputRef}
                type="text"
                className="form-control form-control-lg"
                placeholder="Nhập tên sản phẩm (VD: van 3 tay, KTM-62, trang gập...)"
                value={searchTerm}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onFocus={handleFocus}
                autoComplete="off"
              />
              {searchTerm && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={clearSearch}
                >
                  <i className="fas fa-trash text-danger"></i>
                </button>
              )}

              {/* Dropdown gợi ý */}
              {/* Render suggestions when we have results (don't strictly gate on showSuggestions) */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  className="suggestions-dropdown"
                  style={{ ...dropdownStyle, maxHeight: '60vh', overflowY: 'auto', background: '#fff' }}
                >
                  {suggestions.map((prod, idx) => (
                    <div
                      key={prod.id}
                      className={`suggestion-item ${idx === selectedIndex ? "active" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectProduct(prod);
                      }}
                      style={{ padding: "8px 12px", cursor: "pointer", borderBottom: idx < suggestions.length - 1 ? "1px solid #eee" : "none" }}
                    >
                      {/* <div className="d-flex align-items-center gap-2">
                        {prod.image && (
                          <img src={prod.image} alt={prod.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
                        )} */}
                      <div className="d-flex align-items-center gap-2">
                        {prod.image && (
                          <div className="suggestion-thumb">
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="suggestion-thumb-img"
                            />
                          </div>
                        )}
                        <div className="flex-grow-1">
                          <div className="fw-semibold text-primary">{prod.name}</div>
                          <div className="small text-muted">
                            {prod.code && <span>{prod.code} · </span>}
                            <span className="text-danger fw-bold">{prod.price}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* <div className="suggestion-footer px-2 py-1">
                    <small className="text-muted"><i className="fas fa-keyboard me-1"></i> Dùng ↑↓ để chọn · Enter để xem · Esc để đóng</small>
                  </div> */}
                </div>
              )}
            </div>

            {/* Kết quả sản phẩm đã chọn */}
            {selectedProduct && (
              <div className="card mt-3 shadow-sm">
                <div className="card-body d-flex flex-column flex-md-row align-items-start gap-3">
                  {selectedProduct.image && (
                    <img src={selectedProduct.image} alt={selectedProduct.name} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }} />
                  )}
                  <div className="flex-grow-1">
                    <h6 className="fw-bold text-primary mb-1">{selectedProduct.name}</h6>
                    {selectedProduct.code && (<div className="mb-1 small text-muted">Mã: {selectedProduct.code}</div>)}
                    <div className="mb-2"><span className="text-muted small me-2">Giá:</span><span className="fw-bold text-danger fs-5">{selectedProduct.price}</span></div>
                    <a href={`https://zalo.me/0966201140?message=${encodeURIComponent("Tôi muốn hỏi về: " + selectedProduct.name + " - " + (selectedProduct.price || ""))}`} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm">
                      <i className="fas fa-comments me-1"></i> Hỏi nhanh Bá Đức qua Zalo
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [showShortsModal, setShowShortsModal] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Header />
      <GlobalSearchBar />
      <HeroSection />
      <ProductList />
      <ProductShowcaseTabs />
      <HydraulicBladeProducts />
      <ProductVanTay />
      <SparePartsComponent />
      <InstructionVideos />
      <YoutubeShortsSection onOpen={() => setShowShortsModal(true)} />
      {showShortsModal && <YoutubeShortsModal onClose={() => setShowShortsModal(false)} />}
      <FloatingSocial />
      <FooterCompany />
    </>
  );
}

function Header() {
  return (
    <header className="bg-white shadow-sm py-3 position-relative sticky-header" role="banner">
      <div className="container d-flex justify-content-between align-items-center">
        <h1 className="h4 m-0 text-primary fw-bold">Trang gạt - Xy lanh - KTM</h1>
        <a href="tel:+84966201140" className="btn btn-outline-primary d-none d-md-block">
          <i className="fas fa-phone-alt me-2" aria-hidden="true"></i>Hotline: 0966.201.140
        </a>
      </div>
      <img src="https://res.cloudinary.com/diwxfpt92/image/upload/v1749052964/products/ppe92dmlfy1eticfpdam.jpg" alt="Logo nhỏ" className="position-absolute top-50 end-0 translate-middle-y d-block d-md-none me-3" style={{ height: '32px' }} />
    </header>
  );
}


function HeroSection() {
  return (
    <section className="hero-section text-white position-relative bg-dark" style={{ backgroundImage: 'url(https://res.cloudinary.com/diwxfpt92/image/upload/v1747538306/1_hh8ucd.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', padding: '6rem 0' }} aria-label="Giới thiệu sản phẩm chính">
      <div className="container text-center">
        <h2 className="display-5 fw-bold mb-3">Ty xy lanh – Trang gạt KTM chính hãng</h2>
        <p className="lead mb-4">Bền bỉ – Lắp vừa mọi máy – Giao hàng toàn quốc – Bảo hành 12 tháng</p>
        <div className="d-flex justify-content-center flex-wrap gap-3">
          <a href="https://zalo.me/0966201140" target="_blank" rel="noopener" className="btn btn-success px-4 py-2 fw-semibold rounded-pill">
            <img width="20" src="https://img.icons8.com/color/48/zalo.png" alt="Zalo icon" className="me-2" /> Nhắn Zalo
          </a>
          <a href="tel:+84966201140" className="btn btn-warning px-4 py-2 fw-semibold rounded-pill">
            <i className="fas fa-phone-alt me-2"></i> Gọi ngay
          </a>
          <a href="https://www.facebook.com/profile.php?id=61574648098644" target="_blank" rel="noopener" className="btn btn-primary px-4 py-2 fw-semibold rounded-pill">
            <i className="fab fa-facebook-messenger me-2"></i> Facebook
          </a>
        </div>
      </div>
    </section>
  );
}

function FloatingSocial() {
  return (
    <div className="floating-social" aria-label="Nút liên hệ nhanh">
      <a href="https://zalo.me/0966201140" target="_blank" rel="noopener" className="social-button btn-zalo" aria-label="Liên hệ Zalo">
        <img width="35" height="35" src="https://img.icons8.com/color/48/zalo.png" alt="Zalo icon" />
      </a>
      <a href="https://www.facebook.com/profile.php?id=61574648098644" target="_blank" rel="noopener" className="social-button btn-messenger" aria-label="Liên hệ Facebook">
        <i className="fab fa-facebook-messenger fa-lg" aria-hidden="true"></i>
      </a>
    </div>
  );
}

function ProductShowcaseTabs() {
  const [modalImage, setModalImage] = useState(null);

  const products = [
    {
      title: "Xy lanh giữa",
      image: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538306/2_sxq2wa.jpg",
      price: "1.950.000đ",
      aos: "fade-left"
    },
    {
      title: "Xy lanh nghiêng",
      image: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538307/3_nxbqyo.jpg",
      price: "1.950.000đ",
      aos: "fade-down"
    },
    {
      title: "Xy lanh ủi",
      image: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538307/4_rj8cv2.jpg",
      price: "2.200.000đ",
      aos: "fade-right"
    }
  ];

  return (
    <section className="py-5 bg-light">
      <div className="container">
        <div className="text-center mb-4">
          <h2 className="fw-bold">Chi tiết các dòng xy lanh</h2>
        </div>
        <div className="row">
          {products.map((prod, idx) => (
            <div className="col-4 mb-4 d-flex justify-content-center" key={idx}
              onClick={() => setModalImage(prod.image)}
              data-aos={prod.aos}
              data-aos-delay={idx * 1000}
            >
              <div className="card border-0 text-center">
                <img
                  src={prod.image}
                  alt={prod.title}
                  className="img-fluid rounded shadow clickable"
                  style={{ maxHeight: '200px', cursor: 'pointer' }}
                />
                <div className="card-body p-2">
                  <h5 className="card-title mb-1">{prod.title}</h5>
                  <p className="card-text text-danger fw-bold">{prod.price}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {modalImage && (
          <div className="modal-overlay" onClick={() => setModalImage(null)}>
            <img src={modalImage} alt="Enlarged" className="img-fluid rounded" />
          </div>
        )}
      </div>
    </section>
  );
}



function ProductList() {
  const [timeLeft, setTimeLeft] = useState("");
  const [isPromoOver, setIsPromoOver] = useState(false);
  const [showUrgencyPopup, setShowUrgencyPopup] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set(['van2tay'])); // Mở sẵn nhóm đầu tiên
  const [modalImage, setModalImage] = useState(null); // Thêm state cho modal ảnh

  const deadline = new Date("2025-05-07T18:20:00");
  deadline.setDate(deadline.getDate() + 15);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const distance = deadline - now;

      if (distance <= 0) {
        setTimeLeft("Đã hết khuyến mãi");
        setIsPromoOver(true);
        clearInterval(interval);
        const beep = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
        beep.play();
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((distance / (1000 * 60)) % 60);
      const seconds = Math.floor((distance / 1000) % 60);

      setTimeLeft(`⏰ Còn lại ${days} ngày ${hours} giờ ${minutes} phút ${seconds} giây`);

      if (distance <= 86400000) { // 24 giờ
        setShowUrgencyPopup(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Nhóm sản phẩm theo loại van
  const productGroups = {
    
    van2tay: {
      title: "🔧 Combo Van 2 Tay",
      subtitle: "Điều khiển linh hoạt, phù hợp mọi loại máy",
      products: [
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762120/combo_van_2_tay_2_ty_nghi%C3%AAng_gi%E1%BB%AFa_KTM_bwpf3o.jpg",
          name: "Combo van 2 tay 2 ty nghiêng giữa KTM",
          desc: "Bộ van 2 tay KTM + 1 xylanh nghiêng + 1 xylanh giữa chống tụt + đủ phụ kiện dây ren giá đỡ sẵn lắp",
          price: "7.300.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762121/combo_van_2_tay_1_ty_nghi%C3%AAng_ktm_eumive.jpg",
          name: "Combo van 2 tay 1 ty nghiêng ktm",
          desc: "Bộ van 2 tay KTM + 1 xylanh nghiêng chống tụt + đủ phụ kiện dây ren giá đỡ sẵn lắp - Van có lọc mạt",
          price: "5.080.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762402/combo_van_2_tay_1_ty_gi%E1%BB%AFa_KTM_e6ssao.jpg",
          name: "Combo van 2 tay 1 ty giữa ktm",
          desc: "Bộ van 2 tay KTM + 1 xylanh giữa chống tụt + đủ phụ kiện dây ren giá đỡ sẵn lắp - Van có lọc mạt",
          price: "5.080.000đ",
          promo: false
        }
      ]
    },
    van1tay: {
      title: "🔧 Combo Van 1 Tay",
      subtitle: "Điều khiển đơn giản, phù hợp máy nhỏ",
      products: [
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1751807509/74_combo_van_1_tay_1_xylanh_%E1%BB%A7i_gvf1t1.jpg",
          name: "Combo Van 1 tay + 1 xylanh ủi",
          desc: "Bộ van 1 tay KTM + 1 xylanh ủi chống tụt + đủ phụ kiện dây ren giá đỡ sẵn lắp - Van có lọc mạt",
          price: "5.000.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1751807509/74.1_Combo_1_tay_xylanh_nghi%C3%AAng_thbmua.jpg",
          name: "Combo Van 1 tay + 1 xylanh nghiêng/giữa",
          desc: "Bộ van 1 tay KTM + 1 xylanh nghiêng hoặc giữa chống tụt + đủ phụ kiện dây ren giá đỡ sẵn lắp",
          price: "4.750.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762522/COMBO_VAN_1_TAY_1_TY_GI%E1%BB%AEA_KTM_ulsy1c.jpg",
          name: "Combo Van 1 tay + 1 xylanh nghiêng/giữa",
          desc: "Bộ van 1 tay KTM + 1 xylanh nghiêng hoặc giữa chống tụt + đủ phụ kiện dây ren giá đỡ sẵn lắp",
          price: "4.750.000đ",
          promo: false
        }
      ]
    },
    van3tay: {
      title: "🛠️ Combo Van 3 Tay",
      subtitle: "Phù hợp máy kéo 30-90hp",
      products: [
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749300157/Combo_van_3_tay_xylanh_gi%E1%BB%AFa_mxdsth.jpg",
          name: "Combo Van 3 tay + 1 xylanh giữa",
          desc: "Bộ van 3 tay KTM có lọc mạt + 1 xylanh giữa chống tụt, 2 đầu táo 19 phù hợp máy kéo 30-90hp",
          price: "5.550.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749300461/combo_van_3_tay_3_xylanh_nghi%C3%AAng_gi%E1%BB%AFa_%E1%BB%A7i_mgppxh.jpg",
          name: "Combo Van 3 tay + 3 xylanh",
          desc: "Bộ van 3 tay KTM có lọc mạt + 3 xylanh 1 Nghiêng 1 Giữa 1 nâng hạ rạch vạt + đủ phụ kiện bích dây ren giá đỡ chốt sẵn lắp.",
          price: "10.250.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749300324/Combo_Van_3_tay_2_xylanh_nghi%C3%AAng_gi%E1%BB%AFa_evihrt.jpg",
          name: "Combo Van 3 tay + 2 xylanh",
          desc: "Bộ van 3 tay KTM có lọc mạt + 2 xylanh 1 nghiêng 1 giữa 1 tay chờ kép ren 1/4 lõm nhật - đủ phụ kiện dây ren giá đỡ sẵn lắp",
          price: "7.800.000đ",
          promo: false
        }
      ]
    },
    van4tay: {
      title: "⚙️ Combo Van 4 Tay",
      subtitle: "Điều khiển 4 xy lanh độc lập",
      products: [
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749135217/Combo_van_4_tay_1_xylanh_nghi%C3%AAng_1_xylanh_gi%E1%BB%AFa_nh6gjh.jpg",
          name: "Combo Van 4 tay + 2 xylanh",
          desc: "Combo van 4 tay 2 xylanh: 1 xylanh nghiêng + 1 xylanh giữa mới có chống tụt + đủ phụ kiện chi tiết hướng dẫn lắp đặt - Van có lọc mạt",
          price: "8.300.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762675/combo_van_4_tay_1_ty_gi%E1%BB%AFa_ktm_auo6xo.jpg",
          name: "Combo van 4 tay 1 ty giữa ktm",
          desc: "Combo van 4 tay 1 xylanh giữa mới có chống tụt + đủ phụ kiện chi tiết hướng dẫn lắp đặt - Van có lọc mạt",
          price: "6.050.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762677/combo_van_4_tay_1_ty_nghi%C3%AAng_ktm_eyk6fr.jpg",
          name: "Combo van 4 tay 1 ty nghiêng ktm",
          desc: "Combo van 4 tay 1 xylanh nghiêng mới có chống tụt + đủ phụ kiện chi tiết hướng dẫn lắp đặt - Van có lọc mạt",
          price: "6.050.000đ",
          promo: false
        }
      ]
    },
    van5tay: {
      title: "🔧 Combo Van 5 Tay",
      subtitle: "Điều khiển 5 xy lanh chuyên nghiệp",
      products: [
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747537715/Combo_van_5_tay_2_xylanh_1_nghi%C3%AAng_1_gi%E1%BB%AFa_KTM_htd1au.jpg",
          name: "Combo Van 5 tay + 2 xylanh",
          desc: "Combo van 5 tay 2 xylanh: 1 xylanh nghiêng + 1 xylanh giữa mới có chống tụt + đủ phụ kiện chi tiết hướng dẫn lắp đặt - Van có lọc mạt",
          price: "8.800.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747539250/Combo_van_5_tay_1_xylanh_nghi%C3%AAng_KTM_kv6irg.jpg",
          name: "Combo Van 5 tay + 1 xylanh",
          desc: "Combo van 5 tay + 1 xylanh nghiêng (giữa) mới có chống tụt + đủ phụ kiện chi tiết hướng dẫn lắp đặt - Van có lọc mạt",
          price: "6.550.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762831/combo_van_5_tay_1_ty_gi%E1%BB%AFa_KTM_l74ame.jpg",
          name: "Combo Van 5 tay + 1 xylanh",
          desc: "Combo van 5 tay + 1 xylanh nghiêng (giữa) mới có chống tụt + đủ phụ kiện chi tiết hướng dẫn lắp đặt - Van có lọc mạt",
          price: "6.550.000đ",
          promo: false
        }
      ]
    }
  };

  const toggleGroup = (groupId) => {
    const newExpanded = new Set();
    if (!expandedGroups.has(groupId)) {
      newExpanded.add(groupId);
      // Scroll to the top of the opened combo after a short delay
      setTimeout(() => {
        const element = document.getElementById(`combo-${groupId}`);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <section className="py-5 position-relative">
      {showUrgencyPopup && !isPromoOver && (
        <div className="alert alert-warning text-center position-absolute top-0 start-50 translate-middle-x mt-2 shadow" style={{ zIndex: 1000, maxWidth: '500px' }}>
          🎯 <strong>Chỉ còn chưa đầy 24h!</strong> Mua ngay kẻo lỡ khuyến mãi hấp dẫn!
        </div>
      )}

      <div className="container">
        <div className="text-center mb-5">
          <h2 className="fw-bold">📦 Combo Sản Phẩm Nổi Bật</h2>
          <p className="text-muted">Chọn combo phù hợp với nhu cầu của bạn</p>
        </div>

        <div className="row g-4">
          {Object.entries(productGroups).map(([groupId, group]) => (
            <div key={groupId} className="col-12" id={`combo-${groupId}`}>
              <div className="card border-0 shadow-sm">
                {/* Header của nhóm */}
                <div
                  className="card-header bg-primary text-white p-3 cursor-pointer"
                  onClick={() => toggleGroup(groupId)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1 fw-bold">{group.title}</h5>
                      <small className="opacity-75">{group.subtitle}</small>
                    </div>
                    <div className="d-flex align-items-center">
                      <span className="badge bg-light text-primary me-2">
                        {group.products.length} combo
                      </span>
                      <i className={`fas fa-chevron-${expandedGroups.has(groupId) ? 'up' : 'down'}`}></i>
                    </div>
                  </div>
                </div>

                {/* Nội dung nhóm */}
                {expandedGroups.has(groupId) && (
                  <div className="card-body p-0">
                    <div className="row g-0">
                      {group.products.map((product, index) => (
                        <div key={index} className="col-12 col-md-6 col-lg-4">
                          <div className="border-end border-bottom p-3 h-100">
                            <div className="text-center mb-3">
                              <img
                                src={product.img}
                                alt={product.name}
                                className="img-fluid rounded shadow-sm clickable"
                                style={{ maxHeight: '200px', objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() => setModalImage(product.img)}
                              />
                            </div>

                            <h6 className="fw-bold text-primary mb-2">{product.name}</h6>
                            <p className="text-muted small mb-3" style={{ fontSize: '0.85rem' }}>
                              {product.desc}
                            </p>

                            <div className="text-center">
                              <div className="fw-bold text-danger fs-5 mb-3">
                                {product.price}
                              </div>

                              <a
                                href={`https://zalo.me/0966201140?message=${encodeURIComponent("Tôi muốn tư vấn về " + product.name + " – " + product.desc + " - " + product.price)}`}
                                target="_blank"
                                rel="noopener"
                                className="btn btn-primary btn-sm w-100"
                              >
                                <i className="fas fa-phone-alt me-2"></i>
                                Tư vấn ngay
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Thông tin bổ sung */}
        <div className="text-center mt-5">
          <div className="alert alert-info">
            <h6 className="fw-bold mb-2">💡 Không biết chọn combo nào?</h6>
            <p className="mb-3">Hãy cho chúng tôi biết loại máy và nhu cầu của bạn để được tư vấn phù hợp nhất!</p>
            <a
              href="https://zalo.me/0966201140"
              target="_blank"
              rel="noopener"
              className="btn btn-success btn-lg"
            >
              <i className="fas fa-comments me-2"></i>
              Tư vấn miễn phí
            </a>
          </div>
        </div>
      </div>

      {/* Modal phóng to ảnh */}
      {modalImage && (
        <div className="modal-overlay" onClick={() => setModalImage(null)}>
          <img src={modalImage} alt="Enlarged" className="img-fluid rounded" />
        </div>
      )}
    </section>
  );
}



function HydraulicBladeProducts() {
  const [modalImage, setModalImage] = useState(null); // Thêm state cho modal ảnh

  const allProducts = [
    { stt: 62, name: "Trang Trượt van 4 tay KTM 4 xylanh Lắp trên xới", code: "KTM-62", price: "21,200,000" },
    { stt: 63, name: "Trang Gập Van tay KTM 4 xylanh Lắp trên xới", code: "KTM-63", price: "23,200,000" },
    { stt: 64, name: "Trang Gập Van 4 tay KTM 2 xylanh nâng lắp trên xới", code: "KTM-64", price: "16,500,000" },
    { stt: 65, name: "Trang Trượt Van 4 tay KTM + bừa lăn KTM", code: "KTM-65", price: "24,200,000" },
    { stt: 66, name: "Trang Trượt Van 4 tay KTM + bừa lăn KTM", code: "KTM-66", price: "26,200,000" },
    { stt: 67, name: "Trang Trượt Van 4 tay KTM + bừa đinh KTM", code: "KTM-67", price: "22,700,000" },
    { stt: 68, name: "Trang Gập Van 4 tay KTM + bừa đinh KTM", code: "KTM-68", price: "24,700,000" },
    { stt: 69, name: "Trang Trượt Van 4 tay KTM + Khung độc lập", code: "KTM-69", price: "21,500,000" },
    { stt: 70, name: "Trang Gập KTM Van 4 tay + Khung độc lập", code: "KTM-70", price: "23,500,000" },
    { stt: 71, name: "Bộ trang KTM Van 4 tay thêm xy lanh nghiêng (giữa)", code: "KTM-71", price: "2,000,000" },
    { stt: 72, name: "Bộ trang KTM van 4 tay chuyển thêm 5 tay + 500k", code: "KTM-72", price: "500,000" },
    { stt: 73, name: "Bộ trang KTM van 4 tay chuyển thêm 6 tay + 1.000.000", code: "KTM-73", price: "1,000,000" },
  ];

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("trangTruotLapXoi");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchInputRef = useRef(null);

  // Sử dụng toàn bộ data cho cả desktop và mobile
  const products = allProducts;

  // Sync searchTerm với input value
  useEffect(() => {
    if (searchInputRef.current && searchTerm !== searchInputRef.current.value) {
      searchInputRef.current.value = searchTerm;
    }
  }, [searchTerm]);

  // Tắt dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  // Phân loại sản phẩm
  const categories = {
    all: { name: "Tất cả", count: products.length },
    trangTruotLapXoi: {
      name: "Trang Trượt Lắp Xới",
      count: products.filter(p => p.name.includes("Trượt") && (p.name.includes("xới") || p.name.includes("Lắp trên"))).length
    },
    trangTruotKhungDocLap: {
      name: "Trang Trượt Khung Độc Lập",
      count: products.filter(p => p.name.includes("Trượt") && p.name.includes("Khung độc lập")).length
    },
    trangTruotBuaLan: {
      name: "Trang Trượt + Bừa Lăn",
      count: products.filter(p => p.name.includes("Trượt") && p.name.includes("bừa lăn")).length
    },
    trangGap: { name: "Trang Gập", count: products.filter(p => p.name.includes("Gập")).length },
    phuKien: { name: "Phụ kiện", count: products.filter(p => p.name.includes("thêm") || p.name.includes("chuyển")).length }
  };

  // Hàm bỏ dấu tiếng Việt
  const removeAccents = (str) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // Logic tạo suggestions
  const getSuggestions = () => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];

    const keywords = searchTerm.split(/[\s,]+/).map(k => removeAccents(k.trim())).filter(k => k !== "");
    if (keywords.length === 0) return [];

    // Test case đơn giản - trả về tất cả sản phẩm nếu có từ khóa
    if (searchTerm.toLowerCase().includes('ktm') || searchTerm.toLowerCase().includes('trang')) {
      return products.slice(0, 3).map(prod => ({
        name: prod.name,
        code: prod.code,
        stt: prod.stt,
        price: prod.price
      }));
    }

    const suggestions = products
      .map(prod => ({
        name: prod.name,
        code: prod.code,
        stt: prod.stt,
        price: prod.price
      }))
      .filter(prod => {
        const searchable = [
          prod.name,
          prod.code,
          prod.stt.toString()
        ].map(removeAccents).join(" ");

        return keywords.some(keyword => searchable.includes(keyword));
      })
      .slice(0, 3); // Chỉ lấy tối đa 3 gợi ý để không có scroll

    return suggestions;
  };

  const suggestions = getSuggestions();

  // Handlers cho auto suggest
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(value.length >= 2);
    setSelectedSuggestionIndex(-1);
  };

  // Tính toán vị trí dropdown ngay dưới search input
  const getDropdownPosition = () => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      return {
        top: rect.bottom + 5,
        left: rect.left,
        width: rect.width
      };
    }
    return { top: 200, left: 50, width: 400 };
  };

  const handleSuggestionClick = (suggestion) => {
    console.log('Click suggestion:', suggestion);
    // Đơn giản: chỉ cập nhật search term
    setSearchTerm(suggestion.name);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    // Force update input value với setTimeout
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.value = suggestion.name;
        // Trigger change event
        const event = new Event('input', { bubbles: true });
        searchInputRef.current.dispatchEvent(event);
      }
    }, 100);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSearchFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay để cho phép click vào suggestion
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, 500);
  };

  // Logic mới: Search độc lập với filter, ưu tiên kết quả filter
  const filteredProducts = (() => {
    // Nếu có search term, tìm trong toàn bộ sản phẩm
    if (searchTerm.trim()) {
      // Kiểm tra xem có phải tên sản phẩm đầy đủ không
      const exactMatch = products.find(p => p.name === searchTerm.trim());
      if (exactMatch) {
        // Nếu là tên sản phẩm đầy đủ, chỉ hiển thị sản phẩm đó
        return [exactMatch];
      }

      // Nếu không phải tên đầy đủ, tìm kiếm bình thường
      const keywords = searchTerm.split(/[\s,]+/).map(k => removeAccents(k.trim())).filter(k => k !== "");

      const searchResults = products.filter((prod) => {
        const searchable = [
          prod.name,
          prod.code,
          prod.stt.toString()
        ].map(removeAccents).join(" ");

        // Tìm kiếm linh hoạt: chỉ cần một từ khóa match
        return keywords.some(keyword => searchable.includes(keyword));
      });

      // Nếu có filter active, ưu tiên kết quả filter ở trên đầu
      if (selectedCategory !== "all") {
        const filterResults = searchResults.filter((prod) => {
          if (selectedCategory === "trangTruotLapXoi" && (!prod.name.includes("Trượt") || (!prod.name.includes("xới") && !prod.name.includes("Lắp trên")))) return false;
          if (selectedCategory === "trangTruotKhungDocLap" && (!prod.name.includes("Trượt") || !prod.name.includes("Khung độc lập"))) return false;
          if (selectedCategory === "trangTruotBuaLan" && (!prod.name.includes("Trượt") || !prod.name.includes("bừa lăn"))) return false;
          if (selectedCategory === "trangGap" && !prod.name.includes("Gập")) return false;
          if (selectedCategory === "phuKien" && !prod.name.includes("thêm") && !prod.name.includes("chuyển")) return false;
          return true;
        });

        const otherResults = searchResults.filter((prod) => {
          if (selectedCategory === "trangTruotLapXoi" && (prod.name.includes("Trượt") && (prod.name.includes("xới") || prod.name.includes("Lắp trên")))) return false;
          if (selectedCategory === "trangTruotKhungDocLap" && (prod.name.includes("Trượt") && prod.name.includes("Khung độc lập"))) return false;
          if (selectedCategory === "trangTruotBuaLan" && (prod.name.includes("Trượt") && prod.name.includes("bừa lăn"))) return false;
          if (selectedCategory === "trangGap" && prod.name.includes("Gập")) return false;
          if (selectedCategory === "phuKien" && (prod.name.includes("thêm") || prod.name.includes("chuyển"))) return false;
          return true;
        });

        return [...filterResults, ...otherResults];
      }

      return searchResults;
    }

    // Nếu không có search term, chỉ filter theo category
    if (selectedCategory === "all") return products;

    return products.filter((prod) => {
      if (selectedCategory === "trangTruotLapXoi" && (!prod.name.includes("Trượt") || (!prod.name.includes("xới") && !prod.name.includes("Lắp trên")))) return false;
      if (selectedCategory === "trangTruotKhungDocLap" && (!prod.name.includes("Trượt") || !prod.name.includes("Khung độc lập"))) return false;
      if (selectedCategory === "trangTruotBuaLan" && (!prod.name.includes("Trượt") || !prod.name.includes("bừa lăn"))) return false;
      if (selectedCategory === "trangGap" && !prod.name.includes("Gập")) return false;
      if (selectedCategory === "phuKien" && !prod.name.includes("thêm") && !prod.name.includes("chuyển")) return false;
      return true;
    });
  })();

  return (
    <section className="py-5 bg-light">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="fw-bold text-primary mb-3">🛠️ TRANG GẠT THỦY LỰC KTM</h2>
          <p className="text-muted">Chuyên cung cấp trang gạt thủy lực chính hãng, lắp vừa mọi máy</p>
        </div>

        {/* Hình ảnh tham khảo - To hơn */}
        <div className="text-center mb-5">
          <img
            src="https://res.cloudinary.com/diwxfpt92/image/upload/v1749135668/trang_g%E1%BA%A1t_wleewb.jpg"
            alt="Trang Gạt Thủy Lực KTM"
            className="img-fluid rounded shadow-lg clickable"
            style={{ maxHeight: '500px', objectFit: 'contain', width: '100%', cursor: 'pointer' }}
            onClick={() => setModalImage("https://res.cloudinary.com/diwxfpt92/image/upload/v1749135668/trang_g%E1%BA%A1t_wleewb.jpg")}
          />
          <small className="text-muted d-block mt-3">Hình ảnh thực tế các mẫu trang gạt lắp trên máy</small>
        </div>

        {/* Bộ lọc và tìm kiếm - Giao diện đơn giản */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm filter-card">
              <div className="card-body">
                <h6 className="fw-bold mb-3 text-primary">
                  <i className="fas fa-filter me-2"></i>
                  Chọn loại sản phẩm bạn cần:
                </h6>

                {/* Dropdown filter đơn giản */}
                <div className="row align-items-center">
                  <div className="col-md-6 mb-3 mb-md-0">
                    <label className="form-label fw-semibold">Loại trang gạt:</label>
                    <select
                      className="form-select form-select-lg"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="all">🔍 Tất cả sản phẩm ({categories.all.count})</option>
                      <option value="trangTruotLapXoi">🚜 Trang Trượt Lắp Xới ({categories.trangTruotLapXoi.count})</option>
                      <option value="trangTruotKhungDocLap">🏗️ Trang Trượt Khung Độc Lập ({categories.trangTruotKhungDocLap.count})</option>
                      <option value="trangTruotBuaLan">🌾 Trang Trượt + Bừa Lăn ({categories.trangTruotBuaLan.count})</option>
                      <option value="trangGap">📐 Trang Gập ({categories.trangGap.count})</option>
                      <option value="phuKien">🔧 Phụ kiện ({categories.phuKien.count})</option>
                    </select>
                  </div>

                  <div className="col-md-6 search-wrapper">
                    <label className="form-label fw-semibold">Tìm kiếm theo tên:</label>
                    <div className="input-group" style={{ position: 'relative', zIndex: 10 }}>
                      <span className="input-group-text">
                        <i className="fas fa-search text-muted"></i>
                      </span>
                      <input
                        ref={searchInputRef}
                        id="searchInput"
                        type="text"
                        className="form-control form-control-lg"
                        placeholder="Nhập tên sản phẩm..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onKeyDown={handleKeyDown}
                        onFocus={handleSearchFocus}
                        onBlur={handleSearchBlur}
                        autoComplete="off"
                      />
                      {searchTerm && (
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => setSearchTerm("")}
                          title="Xóa tìm kiếm"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}

                    </div>

                    {/* Auto suggest dropdown - Ngay dưới search */}
                    {searchTerm.length >= 2 && suggestions.length > 0 && showSuggestions && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '0',
                        right: '0',
                        background: 'white',
                        border: '2px solid #007bff',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 99999,
                        marginTop: '5px'
                      }}>
                        {suggestions.map((suggestion, index) => (
                          <div
                            key={`${suggestion.stt}-${index}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSearchTerm(suggestion.name);
                              setShowSuggestions(false);
                              setSelectedSuggestionIndex(-1);
                            }}
                            style={{
                              padding: '10px 15px',
                              cursor: 'pointer',
                              borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none',
                              backgroundColor: index === selectedSuggestionIndex ? '#f8f9fa' : 'white',
                              pointerEvents: 'auto'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', color: '#007bff' }}>{suggestion.name}</div>
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>
                              {suggestion.code} - {suggestion.price} VNĐ
                            </div>
                          </div>
                        ))}
                      </div>
                    )}




                    {/* Auto suggest dropdown - Ngay dưới search */}
                    {searchTerm.length >= 2 && suggestions.length > 0 && showSuggestions && (
                      <div className="suggestions-dropdown" style={{
                        position: 'absolute',
                        top: '100%',
                        left: '0',
                        right: '0',
                        background: 'white',
                        border: '2px solid #007bff',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 9999,
                        overflow: 'visible',
                        maxHeight: 'none',
                        height: 'auto',
                        marginTop: '5px'
                      }}>
                        {suggestions.map((suggestion, index) => (
                          <div
                            key={`${suggestion.stt}-${index}`}
                            className={`suggestion-item ${index === selectedSuggestionIndex ? 'active' : ''}`}
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <div className="fw-semibold text-primary">
                                  #{suggestion.stt} - {suggestion.code}
                                </div>
                                <div className="text-muted small">
                                  {suggestion.name}
                                </div>
                              </div>
                              <div className="text-success fw-bold">
                                {suggestion.price}₫
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="suggestion-footer">
                          <small className="text-muted">
                            <i className="fas fa-keyboard me-1"></i>
                            Sử dụng ↑↓ để chọn, Enter để chọn, Esc để đóng
                          </small>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hiển thị kết quả và nút reset */}
                <div className="mt-3 d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    {searchTerm ? (
                      <>
                        Tìm thấy <strong>{filteredProducts.length}</strong> sản phẩm cho từ khóa "<strong>{searchTerm}</strong>"
                        {selectedCategory !== 'all' && (
                          <span className="ms-2 text-primary">
                            (ưu tiên {categories[selectedCategory].name})
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        Hiển thị <strong>{filteredProducts.length}</strong> sản phẩm
                        {selectedCategory !== 'all' && (
                          <span className="ms-2 text-primary">
                            ({categories[selectedCategory].name})
                          </span>
                        )}
                      </>
                    )}
                  </small>

                  {(selectedCategory !== 'all' || searchTerm) && (
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => {
                        setSelectedCategory('all');
                        setSearchTerm('');
                      }}
                    >
                      <i className="fas fa-refresh me-1"></i>
                      Xem tất cả
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid sản phẩm */}
        <div className="row g-4">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((prod, idx) => (
              <div key={idx} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm border-0 product-card">
                  <div className="card-header bg-primary text-white text-center py-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="badge bg-light text-primary">#{prod.stt}</span>
                      <h6 className="mb-0 fw-bold">{prod.code}</h6>
                      <span className="badge bg-warning text-dark">KTM</span>
                    </div>
                  </div>

                  <div className="card-body d-flex flex-column">
                    <h6 className="card-title fw-bold text-primary mb-3">
                      {prod.name}
                    </h6>

                    <div className="mt-auto">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="text-muted small">Giá bán:</span>
                        <span className="fw-bold text-danger fs-5">
                          {prod.price} đ
                        </span>
                      </div>

                      <a
                        href={`https://zalo.me/0966201140?message=${encodeURIComponent("Tôi muốn mua: " + prod.name + " - " + prod.price + "đ")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary w-100"
                      >
                        <i className="fas fa-shopping-cart me-2"></i>
                        Đặt hàng ngay
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12">
              <div className="text-center py-5">
                <i className="fas fa-search fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">Không tìm thấy sản phẩm phù hợp</h5>
                <p className="text-muted">Vui lòng thử từ khóa khác hoặc liên hệ tư vấn</p>
                <a
                  href="https://zalo.me/0966201140"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <i className="fas fa-phone me-2"></i>
                  Tư vấn miễn phí
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Thông tin bổ sung */}
        <div className="text-center mt-5">
          <div className="alert alert-info">
            <h6 className="fw-bold mb-2">💡 Cần tư vấn chọn trang gạt phù hợp?</h6>
            <p className="mb-3">Hãy cho chúng tôi biết loại máy và nhu cầu để được tư vấn chính xác nhất!</p>
            <a
              href="https://zalo.me/0966201140"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success btn-lg"
            >
              <i className="fas fa-comments me-2"></i>
              Tư vấn miễn phí
            </a>
          </div>
        </div>
      </div>

      {/* Modal phóng to ảnh */}
      {modalImage && (
        <div className="modal-overlay" onClick={() => setModalImage(null)}>
          <img src={modalImage} alt="Enlarged" className="img-fluid rounded" />
        </div>
      )}
    </section>
  );
}

function SparePartsComponent() {
  const spareParts = [
    {
      id: 1,
      name: "Bộ nối nhanh",
      price: "400.000",
      image: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760870151/9-1_n%E1%BB%91i_nhanh_KTM_gsouip.jpg",
      description: "Bộ nối nhanh 3/8 đặc biệt chuyên dùng KTM - Lắp Trên Van KTM 1 đầu đực + 1 đầu cái",
      category: "Khớp nối"
    },
    {
      id: 2,
      name: "Van chống tụt hình vuông",
      price: "630.000",
      image: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760870364/24_Van_ch%E1%BB%91ng_t%E1%BB%A5t_lo%E1%BA%A1i_vu%C3%B4ng_KTM_sdnjcd.jpg",
      description: "Van chống tụt hình vuông lắp trên 2 đường ống 4 đầu ren ra 1/4 lõm nhật",
      category: "Xy lanh"
    },
    {
      id: 3,
      name: "Mặt bích chia nhớt máy kéo",
      price: "460.000",
      // image: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/pump_hydraulic.png",
      description: "Mặt bích chia nhớt máy kéo",
      category: "Xy lanh"
    },
    // {
    //   id: 4,
    //   name: "Van phân phối",
    //   price: "800.000",
    //   image: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/distribution_valve.png",
    //   description: "Van điều khiển dòng thủy lực, độ bền cao",
    //   category: "Van thủy lực"
    // },
    // {
    //   id: 5,
    //   name: "Ống dẫn thủy lực",
    //   price: "350.000",
    //   image: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/hydraulic_hose.png",
    //   description: "Ống dẫn áp suất cao, chịu nhiệt tốt",
    //   category: "Ống dẫn"
    // },
    // {
    //   id: 6,
    //   name: "Khớp nối thủy lực",
    //   price: "180.000",
    //   image: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/hydraulic_coupling.png",
    //   description: "Khớp nối nhanh, kết nối an toàn",
    //   category: "Khớp nối"
    // }
  ];

  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalImage, setModalImage] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchInputRef = useRef(null);

  const categories = ["Tất cả", "Khớp nối", "Xy lanh"];

  // Hàm bỏ dấu tiếng Việt
  const removeAccents = (str) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // Logic tạo suggestions - search linh hoạt
  const getSuggestions = () => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];

    // Filter theo category trước
    let filteredByCategory = spareParts;
    if (selectedCategory !== "Tất cả") {
      filteredByCategory = spareParts.filter(part => part.category === selectedCategory);
    }

    // Search linh hoạt - tìm kiếm trong tên và mô tả (có bỏ dấu)
    const searchNormalized = removeAccents(searchTerm).toLowerCase();
    const suggestions = filteredByCategory
      .filter(part => {
        const partNameNormalized = removeAccents(part.name).toLowerCase();
        const partDescNormalized = removeAccents(part.description).toLowerCase();
        return partNameNormalized.includes(searchNormalized) || partDescNormalized.includes(searchNormalized);
      })
      .slice(0, 5) // Giới hạn 5 suggestions
      .map(part => ({
        id: part.id,
        name: part.name,
        price: part.price,
        category: part.category
      }));

    return suggestions;
  };

  const suggestions = getSuggestions();

  const filteredParts = spareParts.filter(part => {
    const matchesCategory = selectedCategory === "Tất cả" || part.category === selectedCategory;

    if (!searchTerm || searchTerm.trim().length === 0) {
      return matchesCategory;
    }

    // Search linh hoạt - tìm kiếm trong tên và mô tả (có bỏ dấu)
    const searchNormalized = removeAccents(searchTerm).toLowerCase();
    const partNameNormalized = removeAccents(part.name).toLowerCase();
    const partDescNormalized = removeAccents(part.description).toLowerCase();
    const matchesSearch = partNameNormalized.includes(searchNormalized) || partDescNormalized.includes(searchNormalized);

    return matchesCategory && matchesSearch;
  });

  // Sync searchTerm với input value
  useEffect(() => {
    if (searchInputRef.current && searchTerm !== searchInputRef.current.value) {
      searchInputRef.current.value = searchTerm;
    }
  }, [searchTerm]);

  // Tắt dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Kiểm tra xem click có phải vào suggestion item không
      const isSuggestionClick = event.target.closest('.suggestion-item');
      if (searchInputRef.current && !searchInputRef.current.contains(event.target) && !isSuggestionClick) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  // Handlers cho auto suggest
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(value.length >= 2);
    setSelectedSuggestionIndex(-1);
  };

  // Xử lý keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
          const selectedSuggestion = suggestions[selectedSuggestionIndex];
          setSearchTerm(selectedSuggestion.name);
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion) => {
    console.log('SpareParts - Click suggestion:', suggestion);
    setSearchTerm(suggestion.name);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    // Focus lại input để đảm bảo search term được set
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <section className="py-5 bg-white">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="fw-bold text-primary mb-3">🔧 PHỤ TÙNG THỦY LỰC KTM</h2>
          <p className="text-muted">Cung cấp đầy đủ phụ tùng thủy lực chính hãng, chất lượng cao</p>
        </div>

        {/* Bộ lọc và tìm kiếm */}
        <div className="row mb-4 spare-parts-search-container" style={{ overflow: 'visible' }}>
          <div className="col-md-6 mb-3" style={{ overflow: 'visible' }}>
            <div className="input-group position-relative" style={{ overflow: 'visible' }}>
              <span className="input-group-text">
                <i className="fas fa-search"></i>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control"
                placeholder="Tìm kiếm phụ tùng..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (searchTerm.length >= 2) {
                    setShowSuggestions(true);
                  }
                }}
              />

              {/* Debug info removed (cleaned up) */}

              {/* Auto suggest dropdown */}
              {searchTerm.length >= 2 && suggestions.length > 0 && showSuggestions && (
                <div
                  className="suggestions-dropdown"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    right: '0',
                    background: 'white',
                    border: '2px solid #007bff',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 99999,
                    overflow: 'visible',
                    maxHeight: 'none',
                    height: 'auto',
                    marginTop: '5px',
                    display: 'block',
                    visibility: 'visible',
                    opacity: 1
                  }}
                >
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion.id}-${index}`}
                      className={`suggestion-item ${index === selectedSuggestionIndex ? 'active' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSuggestionClick(suggestion);
                      }}
                      style={{
                        padding: '10px 15px',
                        cursor: 'pointer',
                        borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none',
                        backgroundColor: index === selectedSuggestionIndex ? '#f8f9fa' : 'white',
                        pointerEvents: 'auto'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-semibold text-primary">
                            {suggestion.name}
                          </div>
                          <div className="text-muted small">
                            {suggestion.category}
                          </div>
                        </div>
                        <div className="text-success fw-bold">
                          {suggestion.price}₫
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* <div className="suggestion-footer" style={{
                    padding: '8px 15px',
                    borderTop: '1px solid #eee',
                    backgroundColor: '#f8f9fa',
                    fontSize: '12px',
                    color: '#6c757d'
                  }}>
                    <small>
                      <i className="fas fa-keyboard me-1"></i>
                      Sử dụng ↑↓ để chọn, Enter để chọn, Esc để đóng
                    </small>
                  </div> */}
                </div>
              )}
            </div>
          </div>
          <div className="col-md-6">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Danh sách phụ tùng */}
        <div className="row">
          {filteredParts.map(part => (
            <div key={part.id} className="col-lg-4 col-md-6 mb-4">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-img-top-container" style={{ height: '200px', overflow: 'hidden' }}>
                  <img
                    src={part.image}
                    className="card-img-top h-100 w-100"
                    style={{ objectFit: 'cover', cursor: 'pointer' }}
                    alt={part.name}
                    onClick={() => setModalImage(part.image)}
                  />
                </div>
                <div className="card-body d-flex flex-column">
                  <div className="mb-2">
                    <span className="badge bg-primary">{part.category}</span>
                  </div>
                  <h5 className="card-title text-primary fw-bold">{part.name}</h5>
                  <p className="card-text text-muted small flex-grow-1">{part.description}</p>
                  <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="h5 text-success fw-bold mb-0">{part.price}₫</span>
                    </div>
                    <div className="d-grid gap-2">
                      <a
                        href={`https://zalo.me/0966201140?text=Tôi quan tâm đến ${part.name} - ${part.price}₫`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-success"
                      >
                        <i className="fas fa-shopping-cart me-2"></i>
                        Đặt hàng ngay
                      </a>
                      <a
                        href={`https://zalo.me/0966201140?text=Tôi cần tư vấn về ${part.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-primary"
                      >
                        <i className="fas fa-comments me-2"></i>
                        Tư vấn
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Thông báo khi không có kết quả */}
        {filteredParts.length === 0 && (
          <div className="text-center py-5">
            <i className="fas fa-search fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Không tìm thấy phụ tùng phù hợp</h5>
            <p className="text-muted">Hãy thử từ khóa khác hoặc liên hệ để được tư vấn</p>
            <a
              href="https://zalo.me/0966201140"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <i className="fas fa-phone me-2"></i>
              Liên hệ tư vấn
            </a>
          </div>
        )}

        {/* Thông tin bổ sung */}
        <div className="text-center mt-5">
          <div className="alert alert-info">
            <h6 className="fw-bold mb-2">💡 Cần tư vấn chọn phụ tùng phù hợp?</h6>
            <p className="mb-3">Chúng tôi có đội ngũ kỹ thuật chuyên nghiệp, sẵn sàng tư vấn miễn phí!</p>
            <a
              href="https://zalo.me/0966201140"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success btn-lg"
            >
              <i className="fas fa-comments me-2"></i>
              Tư vấn miễn phí
            </a>
          </div>
        </div>
      </div>

      {/* Modal phóng to ảnh */}
      {modalImage && (
        <div className="modal-overlay" onClick={() => setModalImage(null)}>
          <img src={modalImage} alt="Enlarged" className="img-fluid rounded" />
        </div>
      )}
    </section>
  );
}

function ProductVanTay() {
  const vans = [
    { type: "Van 1 tay", price: "1.900.000 đ", color: "success", icon: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/van1_sjzm7p.png" },
    { type: "Van 2 tay", price: "2.200.000 đ", color: "info", icon: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/van2_hogp0r.png" },
    { type: "Van 3 tay", price: "2.700.000 đ", color: "warning", icon: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/van3_qettd5.png" },
    { type: "Van 4 tay", price: "3.200.000 đ", color: "primary", icon: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538311/van4_bxu8ry.png" },
    { type: "Van 5 tay", price: "3.600.000 đ", color: "secondary", icon: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/van5_pjllmw.png" },
    { type: "Van 6 tay", price: "4.100.000 đ", color: "dark", icon: "https://img.icons8.com/color/48/settings.png" }
  ];

  return (
    <section className="py-5 bg-light">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="fw-bold">Van tay thủy lực KTM</h2>
          <p className="text-muted">Điều khiển xy lanh nâng – hạ – gập – trượt phù hợp nhiều dòng máy</p>
        </div>

        {/* ===== DESKTOP: show when ≥992px ===== */}
        <div className="d-none d-md-block">
          <div className="row align-items-center">
            {/* ảnh + nút Zalo */}
            <div className="col-lg-6 text-center mb-4 mb-lg-0">
              <img
                src="https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538307/8_q6acot.jpg"
                alt="Van tay thủy lực KTM"
                className="img-fluid rounded shadow mb-3"
                style={{ maxHeight: '400px' }}
              />
              <div>
                <a
                  href="https://zalo.me/0966201140"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-lg"
                >
                  Nhắn Zalo
                </a>
              </div>
            </div>

            {/* grid 6 items */}
            <div className="col-lg-6">
              <div className="row">
                {vans.map((v, i) => (
                  <div key={i} className="col-4 mb-4">
                    <div className="card h-100 border rounded p-3 text-center shadow-sm">
                      <img
                        src={v.icon}
                        alt={v.type}
                        style={{ width: '50%', height: '50%', margin: '0 auto' }}
                      />
                      <h5 className="mt-2">{v.type}</h5>
                      <p className="text-warning fw-bold">{v.price}</p>
                      {/* <button className="btn btn-outline-primary">
                        Mua
                      </button> */}
                      <a
                        href="https://zalo.me/0966201140"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-primary"
                      >
                        Mua
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ===== MOBILE ===== */}
        <div className="d-block d-lg-none">
          <div className="row g-2 mb-4">
            {vans.map((v, i) => (
              <div className="col-4 text-center" key={i}>
                <img src={v.icon} alt={v.type} style={{ width: '50%', height: '50%' }} />
                <div className="fw-semibold small mt-1">{v.type}</div>
                <div className="fw-bold text-danger small">{v.price}</div>
                <a
                  href="https://zalo.me/0966201140"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn btn-sm btn-${v.color} mt-1`}
                >
                  Mua ngay
                </a>
              </div>
            ))}
          </div>

          <a
            href="https://zalo.me/0966201140"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-danger btn-lg fw-bold w-100"
          >
            Mua ngay
          </a>
        </div>
      </div>
    </section>
  );
}


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
  const [activeVideo, setActiveVideo] = useState(null);

  const videos = [
    { id: 1, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749269320/bao-gia-trang-gat-doc-lap_exzhpm.jpg", url: "https://www.youtube.com/embed/U9v6y7kIJ9A?si=LUUh8N05b5fhXo4I" },
    { id: 2, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749269576/bao-gia-trang-gat-tren-xoi_u9jocc.jpg", url: "https://www.youtube.com/embed/oLC34LfasrI?si=zDNi3tsbEh0d-nH7" },
    { id: 3, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749277751/Trang-gat_fmkuqw.jpg", url: "https://www.youtube.com/embed/GEt7NB5GwIU?si=yMh6SCJgKUckIEQy" },
    { id: 4, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/youtube1_y63sbd.jpg", url: "https://www.youtube.com/embed/2MLY9YJrroU?si=qvuJDHHp3bmNcIWY" },
    { id: 5, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/youtube4_ykmqip.jpg", url: "https://www.youtube.com/embed/x2TQKWooJEQ?si=n-cUkEEnpIqwx_iY" },
    { id: 6, thumb: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/youtube5_dy8uj1.jpg", url: "https://www.youtube.com/embed/_M6O7gCgdAc?si=nt8RATetDmGp5_3f" },
  ];

  return (
    <section className="py-5">
      <div className="container text-center">
        <h2 className="fw-bold mb-4">Video hướng dẫn</h2>
        <div className="row g-3">
          {videos.map((v, i) => (
            <div key={i} className="col-6 col-md-4">
              <div className="position-relative video-thumb" onClick={() => setActiveVideo(v.url)} style={{ cursor: "pointer" }}>
                <img src={v.thumb} alt={`video ${i + 1}`} className="img-fluid rounded shadow" />
                <div className="position-absolute top-50 start-50 translate-middle">
                  <i className="fas fa-play-circle fa-2x text-white"></i>
                </div>
              </div>
            </div>
          ))}
        </div>

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

// function YoutubeShortsSection({ onOpen }) {
//   return (
//     <section className="py-5 bg-dark text-white text-center">
//       <div className="container">
//         <h2 className="fw-bold mb-3">🎬 Video ngắn - Mẹo máy nông nghiệp</h2>
//         <p className="text-light">Lướt xem những mẹo nhanh cực hay giống TikTok/Youtube Shorts</p>
//         <button className="btn btn-danger mt-3 px-4" onClick={onOpen}>
//           Xem video dạng lướt
//         </button>
//       </div>
//     </section>
//   );
// }

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


// function YoutubeShortsModal({ onClose }) {
//   const shorts = [
//     "UCreMHzob5c",
//     "X7KeEUeH08s",
//     "aRGJaryWCZM",
//     "1jUJZ3JVYrE",
//     "P4B9jBiCumw",
//     "FEDQpcHVzEA",
//     "sg45zTOzlr8",
//     "VuPrPSkBtNE",
//     "7aGK8dR8pK0"
//   ];
//   const containerRef = React.useRef(null);
//   const iframeRefs = React.useRef([]);

//   // Pause all videos except current
//   const handleIntersection = (entries) => {
//     entries.forEach((entry) => {
//       const iframe = entry.target.querySelector("iframe");
//       if (!iframe) return;
//       if (entry.isIntersecting) {
//         // Play video
//         iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
//       } else {
//         // Pause video
//         iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
//       }
//     });
//   };

//   useEffect(() => {
//     const observer = new IntersectionObserver(handleIntersection, {
//       threshold: 0.6
//     });

//     const items = containerRef.current.querySelectorAll(".short-item");
//     items.forEach((el) => observer.observe(el));

//     return () => observer.disconnect();
//   }, []);

//   return (
//     <div className="modal-overlay-full bg-black text-white" style={{ zIndex: 9999 }}>
//       <button className="btn btn-light text-danger position-absolute top-0 end-0 m-3" onClick={onClose}>
//         Tắt
//       </button>
//       <div
//         className="shorts-container"
//         ref={containerRef}
//         style={{
//           height: "100vh",
//           overflowY: "scroll",
//           scrollSnapType: "y mandatory",
//         }}
//       >
//         {shorts.map((id, i) => (
//           <div
//             key={i}
//             className="short-item"
//             style={{
//               height: "100vh",
//               scrollSnapAlign: "start",
//             }}
//           >
//             <iframe
//               ref={(el) => (iframeRefs.current[i] = el)}
//               width="100%"
//               height="100%"
//               src={`https://www.youtube.com/embed/${id}?enablejsapi=1&playsinline=1&rel=0&autoplay=0`}
//               frameBorder="0"
//               allow="autoplay; encrypted-media"
//               allowFullScreen
//               webkitallowfullscreen
//               title={`Short ${i}`}
//             ></iframe>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

function YoutubeShortsModal({ onClose }) {
  const shorts = [
    "UCreMHzob5c", "X7KeEUeH08s", "aRGJaryWCZM",
    "1jUJZ3JVYrE", "P4B9jBiCumw", "FEDQpcHVzEA",
    "sg45zTOzlr8", "VuPrPSkBtNE", "7aGK8dR8pK0"
  ];
  const containerRef = React.useRef(null);
  const iframeRefs = React.useRef([]);

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

  React.useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, { threshold: 0.6 });
    const items = containerRef.current.querySelectorAll(".short-item");
    items.forEach((el) => observer.observe(el));

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
    handlePuzzleComplete()
    const { name, phone } = formData;
    if (!name || !phone) return setError("Vui lòng nhập đủ thông tin");
    if (!validatePhone(phone)) return setError("Số điện thoại không hợp lệ");
    setError("");
    setStep(2); // sang puzzle
  };

  // const handleFormSubmit = async () => {
  //   const { name, phone } = formData;
  //   if (!name || !phone) return setError("Vui lòng nhập đủ thông tin");
  //   if (!validatePhone(phone)) return setError("Số điện thoại không hợp lệ");

  // try {
  //   // Gửi dữ liệu lên Google Sheet thông qua SheetDB
  //   const response = await fetch("https://sheetdb.io/api/v1/br3yxz6v6al06", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       data: {
  //         Name: name,
  //         Phone: phone,
  //       },
  //     }),
  //   });


  //   if (!response.ok) {
  //     throw new Error("Gửi dữ liệu thất bại");
  //   }

  //     // Nếu thành công, tiếp tục game
  //     setError("");
  //     setStep(2); // sang bước puzzle
  //   } catch (error) {
  //     console.error("Lỗi gửi dữ liệu:", error);
  //     setError("Có lỗi xảy ra, vui lòng thử lại sau.");
  //   }
  // };


  // const handlePuzzleComplete = () => {
  //   const codes = ["KM10%", "KM5%", "FREESHIP", "QUA-TANG", "SALE2025"];
  //   setCode(codes[Math.floor(Math.random() * codes.length)]);
  //   setStep(3);
  // };

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
        {/* ✅ Canvas pháo hoa full màn */}
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
          <button className=" btn-sm btn-danger position-absolute top-0 end-0 button-close-margin" onClick={() => setStep(null)}>&times;</button>

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
            // <MemoryMatchGame onWin={() => setStep(3)} />
            // <PuzzleBoard image="2.jpg" onComplete={handlePuzzleComplete} />
            <SlotMachine setStep={setStep} formData={formData} />

          )}


          {step === 3 && (
            <ScratchCard code={code} onDone={() => setScratchDone(true)} />
            // <SlotMachine />
            //  <LuckyWheel />
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


function PuzzleBoard({ image, onComplete }) {
  const size = 3;
  const [tiles, setTiles] = React.useState([]);
  const [blankIndex, setBlankIndex] = React.useState(size * size - 1);

  React.useEffect(() => {
    const initial = [...Array(size * size).keys()];
    const shuffled = shuffle(initial);
    setTiles(shuffled);
    setBlankIndex(shuffled.indexOf(size * size - 1));
    handlePuzzleComplete();
  }, []);

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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 2; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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



// quay thưởng ngẫu nhiên
// function SlotMachine({ setStep }) {
//   const [spinning, setSpinning] = React.useState(false);
//   const [slots, setSlots] = React.useState(["", "", ""]);
//   const [result, setResult] = React.useState(null);
//   const [spinsLeft, setSpinsLeft] = React.useState(3);
//   const [bonusClaimed, setBonusClaimed] = React.useState({
//     fb: false,
//     tiktok: false,
//     youtube: false,
//   });

//   const images = [
//     { name: "🍎", image: "1.jpg", prize: "Giảm 100K phí vận chuyển" },
//     { name: "🍋", image: "51.jpg", prize: "Giảm 200K phí vận chuyển" },
//     { name: "🍉", image: "van1.png", prize: "Giảm 300K phí vận chuyển" },
//     { name: "🍇", image: "van2.png", prize: "Giảm 400K phí vận chuyển" },
//   ];

//   const spin = () => {
//     if (spinning || spinsLeft <= 0) return;

//     setSpinning(true);
//     setResult(null);

//     const winningChance = 0;

//     const interval = setInterval(() => {
//       const temp = Array(3).fill().map(() => images[Math.floor(Math.random() * images.length)]);
//       setSlots(temp);

//       if (Math.random() < 0.05) {
//         clearInterval(interval);
//         let final;

//         if (Math.random() < winningChance) {
//           const chosen = images[Math.floor(Math.random() * images.length)];
//           final = [chosen, chosen, chosen];
//         } else {
//           const shuffled = images.sort(() => 0.5 - Math.random());
//           final = [shuffled[0], shuffled[1], shuffled[2]];
//         }

//         setSlots(final);
//         setSpinning(false);
//         const remaining = spinsLeft - 1;
//         // setSpinsLeft(prev => prev - 1);
//         setSpinsLeft(remaining)

//         if (final[0].name === final[1].name && final[1].name === final[2].name) {
//           setResult(`🎉 Bạn trúng: ${final[0].prize}!`);
//           // setTimeout(() => setStep(4), 5000); // chuyển luôn nếu trúng
//         } else {
//           setResult("💔 Không trúng thưởng, thử lại nhé!");
//           // if (remaining <= 0) {
//           //   setTimeout(() => setStep(4), 5000); // chuyển luôn nếu hết lượt
//           // }
//         }
//       }
//     }, 100);
//   };

//   const claimBonus = (platform) => {
//     if (bonusClaimed[platform]) return;

//     setBonusClaimed(prev => ({ ...prev, [platform]: true }));
//     setSpinsLeft(prev => Math.min(prev + 1, 6));

//     if (platform === "fb") window.open("https://facebook.com/profile.php?id=61574648098644", "_blank");
//     if (platform === "tiktok") window.open("https://www.tiktok.com/@nongcubaduc", "_blank");
//     if (platform === "youtube") window.open("https://www.youtube.com/@nongcubaduc", "_blank");

//   };

//   return (
//     <div className="text-center my-5">
//       <h4 className="mb-3">🎰 Quay số may mắn</h4>
//       <p className="text-muted">Lượt quay còn lại: <strong>{spinsLeft}</strong>/3</p>

//       <div className="d-flex justify-content-center align-items-center gap-3 mb-3">
//         {slots.map((slot, idx) => (
//           <div key={idx} className="border p-2 rounded shadow" style={{ width: 80, height: 80, background: "#fff" }}>
//             {slot && <img src={slot.image} alt={slot.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
//           </div>
//         ))}
//       </div>

//       <button className="btn btn-danger px-4" onClick={spin} disabled={spinning || spinsLeft <= 0}>
//         {spinning ? "Đang quay..." : "Quay số"}
//       </button>

//       {result && <p className="mt-3 fw-bold text-success">{result}</p>}

//       {spinsLeft <= 0 && (
//         <div className="mt-4">
//           <p><strong>Hết lượt quay miễn phí.</strong> Hãy theo dõi để nhận thêm lượt:</p>
//           <div className="d-flex justify-content-center gap-3">
//             {!bonusClaimed.fb && (
//               <button className="btn btn-outline-primary" onClick={() => claimBonus('fb')}>
//                 <i className="fab fa-facebook"></i> Facebook
//               </button>
//             )}
//             {!bonusClaimed.tiktok && (
//               <button className="btn btn-outline-dark" onClick={() => claimBonus('tiktok')}>
//                 <i className="fab fa-tiktok"></i> TikTok
//               </button>
//             )}
//             {!bonusClaimed.youtube && (
//               <button className="btn btn-outline-danger" onClick={() => claimBonus('youtube')}>
//                 <i className="fab fa-youtube"></i> YouTube
//               </button>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// ép trúng thưởng ở slot quay cuối
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

      // Bắn pháo hoa
      const canvas = document.getElementById("confetti-canvas");
      if (canvas) {
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
        handleSpinResult(isLastSpin); // gọi hàm async xử lý kết quả
        // let final;
        // if (isLastSpin) {
        //   const chosen = images[Math.floor(Math.random() * images.length)];
        //   final = [chosen, chosen, chosen];
        // } else {
        //   const shuffled = images.sort(() => 0.5 - Math.random());
        //   final = [shuffled[0], shuffled[1], shuffled[2]];
        // }

        // setSlots(final);
        // setSpinsUsed((prev) => prev + 1);
        // setSpinning(false);

        // if (final[0].name === final[1].name && final[1].name === final[2].name) {
        //   setResult(`🎉 Xin chúc mừng bạn đã trúng: ${final[0].prize}!
        //     Vui lòng liên hệ fb hoặc zalo để nhận thưởng nhé bạn`);
        //    // 👉 BẮN PHÁO HOA
        //   //  for (let i = 0; i < 5; i++) {
        //   //   setTimeout(() => {
        //   //     confetti({
        //   //       particleCount: 100,
        //   //       spread: 70,
        //   //       origin: { x: Math.random(), y: Math.random() * 0.6 }
        //   //     });
        //   //   }, i * 300);
        //   // }

        //    // 🎆 BẮN PHÁO HOA TRONG MODAL
        //    const canvas = document.getElementById("confetti-canvas");
        //    if (canvas) {
        //      const confettiInstance = confetti.create(canvas, {
        //        resize: true,
        //        useWorker: true
        //      });
        //      for (let i = 0; i < 25; i++) {
        //        setTimeout(() => {
        //          confettiInstance({
        //            particleCount: 100,
        //            spread: 70,
        //            origin: { x: Math.random(), y: Math.random() * 0.6 }
        //          });
        //        }, i * 1000);
        //      }
        //     }

        //     const gift = final[0].prize;


        //      // ✅ Gọi API lưu khách trúng thưởng
        //     try {
        //       await fetch("https://sheetdb.io/api/v1/br3yxz6v6al06", {
        //         method: "POST",
        //         headers: { "Content-Type": "application/json" },
        //         body: JSON.stringify({
        //           data: {
        //             Name: formData.name,
        //             Phone: formData.phone,
        //             Gift: gift,
        //           },
        //         }),
        //       });
        //     } catch (error) {
        //       console.error("Lỗi khi lưu vào sheet:", error);
        //     }

        //   setTimeout(() => setStep(null), 25000); // đóng modal
        // } else {
        //   setResult("💔 Không trúng thưởng, thử lại nhé!");
        //   // if (spinsUsed + 1 >= totalSpins) {
        //     // setTimeout(() => setStep(4), 3000);
        //   // }
        // }
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
            <strong>Hết lượt quay miễn phí.</strong> Hãy theo dõi để nhận thêm
            lượt:
          </p>
          <div className="d-flex justify-content-center gap-3">
            {!bonusClaimed.fb && (
              <button
                className="btn btn-outline-primary"
                onClick={() => claimBonus("fb")}
              >
                <i className="fab fa-facebook"></i> Facebook
              </button>
            )}
            {!bonusClaimed.youtube && (
              <button
                className="btn btn-outline-danger"
                onClick={() => claimBonus("youtube")}
              >
                <i className="fab fa-youtube"></i> YouTube
              </button>
            )}
            {!bonusClaimed.tiktok && (
              <button
                className="btn btn-outline-dark"
                onClick={() => claimBonus("tiktok")}
              >
                <i className="fab fa-tiktok"></i> TikTok
              </button>
            )}
          </div>
        </div>
      )}
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
    const anglePerSlice = 360 / prizes.length;

    // Góc cần quay sao cho trung tâm slice trúng nằm tại 270° (trên đầu)
    const sliceCenterAngle = newIndex * anglePerSlice + anglePerSlice / 2;
    const baseAngle = 270; // mũi tên nằm ở top
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

        {/* Mũi tên chỉ */}
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


// function FooterCompany() {
//   return (
//     <>
//       {/* PHẦN CHÍNH - NỀN VÀNG NHẠT */}
//       <footer style={{
//         backgroundColor: "#ffff80",
//         padding: "20px 10px",
//         textAlign: "center",
//         fontSize: "16px",
//         lineHeight: "1.7",
//         color: "#000"
//       }}>
//         <div>
//           <h2 style={{ fontWeight: "normal", fontSize: "22px", marginBottom: "15px", color: "#444" }}>
//             KỸ THUẬT, PHỤ TÙNG MÁY CƠ GIỚI
//           </h2>

//           <div style={{ fontWeight: "bold" }}>
//             Hotline đặt mua hàng:{" "}
//             <span style={{ color: "red" }}>0862 417 919 Ms Thúy</span>
//           </div>

//           <div style={{ fontWeight: "bold", color: "red", marginBottom: "10px" }}>
//             0949 265 919 Ms Thơm
//           </div>

//           <div>
//             Email:{" "}
//             <a href="mailto:kythuatmayktm@gmail.com" style={{ color: "#0000ff", fontWeight: "bold" }}>
//               kythuatmayktm@gmail.com
//             </a>
//           </div>

//           <div style={{ fontWeight: "bold", margin: "10px 0" }}>
//             Địa chỉ vp - Kho phát hàng
//           </div>

//           <div>
//             <span style={{ color: "#0000ff", fontWeight: "bold" }}>Hà Nội:</span>{" "}
//             27.12 ICID Complex Lê Trọng Tấn - Hà Đông - Hà Nội
//           </div>

//           <div>
//             <span style={{ color: "#0000ff", fontWeight: "bold" }}>Thanh Hóa:</span>{" "}
//             TT Quán Lào - Yên Định - Thanh Hóa
//           </div>

//           <div>
//             <span style={{ color: "#0000ff", fontWeight: "bold" }}>Nghệ An:</span>{" "}
//             Ngã 4 Đồng Hiếu Đường HCM - Thái Hòa - Nghệ An
//           </div>

//           <div>
//             <span style={{ color: "#0000ff", fontWeight: "bold" }}>Bình Dương:</span>{" "}
//             Khu phố Phú Nghị, Phường Hòa Lợi, thị xã Bến Cát, tỉnh Bình Dương
//           </div>

//           <div>
//             <span style={{ color: "#0000ff", fontWeight: "bold" }}>Cần Thơ:</span>{" "}
//             Khu phố Thới An 3, Phường Thuận An, Quận Thốt Nốt, TP Cần Thơ
//           </div>

//           <div style={{ fontWeight: "bold", margin: "15px 0 5px" }}>
//             Tư vấn Kỹ thuật Máy:
//           </div>

//           <div>
//             <b>Kỹ thuật máy John Deere:</b> 0398 490 986
//           </div>

//           <div>
//             <b>Kỹ thuật máy Kubota:</b> 0904 987 558
//           </div>

//           <div>
//             <b>Kỹ thuật máy Yanmar:</b> 097 234 9545
//           </div>

//           <div style={{ marginTop: "20px" }}>
//             <span style={{ color: "#0000ff", fontWeight: "bold" }}>Kythuatmay.vn</span>
//           </div>

//           <div>
//             Kho kỹ thuật máy và phụ tùng trên tay của bạn!
//           </div>

//           <div style={{ marginTop: "10px", fontWeight: "bold" }}>
//             CÔNG TY TNHH KỸ THUẬT MÁY KTM
//           </div>

//           <div style={{ fontSize: "14px", marginBottom: "10px" }}>
//             Giấy phép kinh doanh số 2802799630 do Sở KHĐT T. Thanh Hóa cấp ngày 02/10/2019
//           </div>
//         </div>
//       </footer>

//       {/* PHẦN DƯỚI - NỀN VÀNG ĐẬM #ffc107 */}
//       <div style={{
//         backgroundColor: "#ffc107",
//         color: "#fff",
//         padding: "10px 15px",
//         fontSize: "14px",
//         textAlign: "center",
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         flexWrap: "wrap",
//         gap: "15px"
//       }}>
//         <a href="#" style={{ color: "#fff", textDecoration: "none" }}>Chính sách quy định chung</a>
//         <a href="#" style={{ color: "#fff", textDecoration: "none" }}>Chính sách bảo mật</a>
//         <div style={{ fontSize: "14px", color: "#fff" }}>
//           CÔNG TY TNHH KỸ THUẬT MÁY KTM
//           <br />
//           Giấy phép kinh doanh số 2802799630 do Sở KHĐT T. Thanh Hóa cấp ngày 02/10/2019
//         </div>
//         <img
//           src="https://kythuatmay.vn/wp-content/uploads/2022/06/dathongbao.png"
//           alt="giấy phép"
//           style={{ height: "20px" }}
//         />
//       </div>

//       {/* PHẦN CUỐI CÙNG - NỀN ĐEN #222 */}
//       <div style={{
//         backgroundColor: "#222",
//         color: "#fff",
//         padding: "8px 10px",
//         fontSize: "14px",
//         textAlign: "center"
//       }}>
//         <a href="#" style={{ color: "#fff", margin: "0 8px", textDecoration: "none" }}>Chính sách quy định chung</a>
//         |
//         <a href="#" style={{ color: "#fff", margin: "0 8px", textDecoration: "none" }}>Chính sách bảo mật</a>
//         |
//         <img
//           src="https://kythuatmay.vn/wp-content/uploads/2022/06/dathongbao.png"
//           alt="giấy phép"
//           style={{ height: "16px", marginLeft: "8px", verticalAlign: "middle" }}
//         />
//       </div>
//     </>
//   );
// }


function FooterCompany() {
  return (
    <>
      {/* PHẦN CHÍNH - NỀN VÀNG NHẠT */}
      <footer style={{
        backgroundColor: "#ffff80",
        padding: "20px 10px",
        textAlign: "center",
        fontSize: "16px",
        lineHeight: "1.7",
        color: "#000"
      }}>
        <div>
          <h2 style={{ fontWeight: "normal", fontSize: "22px", marginBottom: "15px", color: "#444" }}>
            KỸ THUẬT, PHỤ TÙNG MÁY CƠ GIỚI
          </h2>

          <div style={{ fontWeight: "bold" }}>
            Hotline đặt mua hàng:{" "}
            <span style={{ color: "red" }}><a href="tel:0966 201 140">0966 201 140</a> Mr Bá Đức</span>
          </div>

          {/* <div style={{ fontWeight: "bold", color: "red", marginBottom: "10px" }}>
            0949 265 919 Ms Thơm
          </div> */}

          <div>
            Email:{" "}
            <a href="mailto:kythuatmayktm@gmail.com" style={{ color: "#0000ff", fontWeight: "bold" }}>
              kythuatmayktm@gmail.com
            </a>
          </div>

          <div style={{ fontWeight: "bold", margin: "10px 0" }}>
            Địa chỉ vp - Kho phát hàng
          </div>

          <div>
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Hà Nội:</span>{" "}
            27.12 ICID Complex Lê Trọng Tấn - Hà Đông - Hà Nội
          </div>

          <div>
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Thanh Hóa:</span>{" "}
            TT Quán Lào - Yên Định - Thanh Hóa
          </div>

          <div>
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Nghệ An:</span>{" "}
            Ngã 4 Đồng Hiếu Đường HCM - Thái Hòa - Nghệ An
          </div>

          <div>
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Bình Dương:</span>{" "}
            Khu phố Phú Nghị, Phường Hòa Lợi, thị xã Bến Cát, tỉnh Bình Dương
          </div>

          <div>
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Cần Thơ:</span>{" "}
            Khu phố Thới An 3, Phường Thuận An, Quận Thốt Nốt, TP Cần Thơ
          </div>

          <div style={{ fontWeight: "bold", margin: "15px 0 5px" }}>
            Tư vấn Kỹ thuật Máy:
          </div>

          <div>
            <b>Kỹ thuật máy John Deere:</b> 0398 490 986
          </div>

          <div>
            <b>Kỹ thuật máy Kubota:</b> 0904 987 558
          </div>

          <div>
            <b>Kỹ thuật máy Yanmar:</b> 097 234 9545
          </div>

          <div style={{ marginTop: "20px" }}>
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Kythuatmay.vn</span>
            <br />
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Thuyluc.shop</span>
          </div>

          <div>
            Kho kỹ thuật máy và phụ tùng trên tay của bạn!
          </div>

          <div style={{ marginTop: "10px", fontWeight: "bold" }}>
            CÔNG TY TNHH KỸ THUẬT MÁY KTM
          </div>

          <div style={{ fontSize: "14px", marginBottom: "10px" }}>
            Giấy phép kinh doanh số 2802799630 do Sở KHĐT T. Thanh Hóa cấp ngày 02/10/2019
          </div>
        </div>
      </footer>

      {/* PHẦN DƯỚI - NỀN VÀNG ĐẬM */}
      <div style={{
        backgroundColor: "#ffc107",
        color: "#fff",
        padding: "10px 15px",
        fontSize: "14px",
        textAlign: "center",
        display: "flex",
        justifyContent: "space-evenly",
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "5px" }}>
          <a href="https://kythuatmay.vn/chinh-sach-quy-dinh-chung" style={{ color: "#fff", textDecoration: "none" }}>Chính sách quy định chung</a>
          <a href="https://kythuatmay.vn/chinh-sach-bao-mat" style={{ color: "#fff", textDecoration: "none" }}>Chính sách bảo mật</a>
        </div>

        <div style={{ fontSize: "14px", color: "#fff", textAlign: "center" }}>
          CÔNG TY TNHH KỸ THUẬT MÁY KTM
          <br />
          Giấy phép kinh doanh số 2802799630 do Sở KHĐT T. Thanh Hóa cấp ngày 02/10/2019
        </div>

        <a href="http://online.gov.vn/Home/WebDetails/61330">
          <img
            src="https://res.cloudinary.com/diwxfpt92/image/upload/v1749379288/logoSaleNoti_whjtfz.png"
            alt="giấy phép"
            style={{ height: "50px" }}
          />
        </a>
      </div>

      {/* PHẦN CUỐI - NỀN ĐEN */}
      {/* <div style={{
        backgroundColor: "#222",
        color: "#fff",
        padding: "8px 10px",
        fontSize: "14px",
        textAlign: "center"
      }}>
        <a href="#" style={{ color: "#fff", margin: "0 8px", textDecoration: "none" }}>Chính sách quy định chung</a>
        |
        <a href="#" style={{ color: "#fff", margin: "0 8px", textDecoration: "none" }}>Chính sách bảo mật</a>
        |
        <img
          src="https://kythuatmay.vn/wp-content/uploads/2022/06/dathongbao.png"
          alt="giấy phép"
          style={{ height: "16px", marginLeft: "8px", verticalAlign: "middle" }}
        />
      </div> */}
    </>
  );
}



ReactDOM.render(<App />, document.getElementById("root"));
