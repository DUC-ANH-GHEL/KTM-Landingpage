// app.js - Main Application Entry Point
// Các component được load từ folder components/ qua index.html
// File này chỉ chứa: HydraulicBladeProducts, SparePartsComponent, App

const { useState, useEffect, useRef } = React;

// ================== HYDRAULIC BLADE PRODUCTS ==================
function HydraulicBladeProducts() {
  const [modalImage, setModalImage] = useState(null);

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

  const products = allProducts;

  useEffect(() => {
    if (searchInputRef.current && searchTerm !== searchInputRef.current.value) {
      searchInputRef.current.value = searchTerm;
    }
  }, [searchTerm]);

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

  const removeAccents = (str) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const getSuggestions = () => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];

    const keywords = searchTerm.split(/[\s,]+/).map(k => removeAccents(k.trim())).filter(k => k !== "");
    if (keywords.length === 0) return [];

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
        const searchable = [prod.name, prod.code, prod.stt.toString()].map(removeAccents).join(" ");
        return keywords.some(keyword => searchable.includes(keyword));
      })
      .slice(0, 3);

    return suggestions;
  };

  const suggestions = getSuggestions();

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(value.length >= 2);
    setSelectedSuggestionIndex(-1);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.name);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
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
    if (suggestions.length > 0) setShowSuggestions(true);
  };

  const handleSearchBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, 500);
  };

  const filteredProducts = (() => {
    if (searchTerm.trim()) {
      const exactMatch = products.find(p => p.name === searchTerm.trim());
      if (exactMatch) return [exactMatch];

      const keywords = searchTerm.split(/[\s,]+/).map(k => removeAccents(k.trim())).filter(k => k !== "");
      const searchResults = products.filter((prod) => {
        const searchable = [prod.name, prod.code, prod.stt.toString()].map(removeAccents).join(" ");
        return keywords.some(keyword => searchable.includes(keyword));
      });

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

        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm filter-card">
              <div className="card-body">
                <h6 className="fw-bold mb-3 text-primary">
                  <i className="fas fa-filter me-2"></i>
                  Chọn loại sản phẩm bạn cần:
                </h6>

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
                        <button className="btn btn-outline-secondary" onClick={() => setSearchTerm("")} title="Xóa tìm kiếm">
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>

                    {searchTerm.length >= 2 && suggestions.length > 0 && showSuggestions && (
                      <div className="suggestions-dropdown" style={{
                        position: 'absolute', top: '100%', left: '0', right: '0',
                        background: 'white', border: '2px solid #007bff', borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, marginTop: '5px'
                      }}>
                        {suggestions.map((suggestion, index) => (
                          <div
                            key={`${suggestion.stt}-${index}`}
                            className={`suggestion-item ${index === selectedSuggestionIndex ? 'active' : ''}`}
                            onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(suggestion); }}
                            style={{
                              padding: '10px 15px', cursor: 'pointer',
                              borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none',
                              backgroundColor: index === selectedSuggestionIndex ? '#f8f9fa' : 'white'
                            }}
                          >
                            <div className="fw-semibold text-primary">#{suggestion.stt} - {suggestion.code}</div>
                            <div className="text-muted small">{suggestion.name}</div>
                            <div className="text-success fw-bold">{suggestion.price}₫</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Hiển thị <strong>{filteredProducts.length}</strong> sản phẩm
                  </small>

                  {(selectedCategory !== 'all' || searchTerm) && (
                    <button className="btn btn-outline-primary btn-sm" onClick={() => { setSelectedCategory('all'); setSearchTerm(''); }}>
                      <i className="fas fa-refresh me-1"></i> Xem tất cả
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

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
                    <h6 className="card-title fw-bold text-primary mb-3">{prod.name}</h6>
                    <div className="mt-auto">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="text-muted small">Giá bán:</span>
                        <span className="fw-bold text-danger fs-5">{prod.price} đ</span>
                      </div>
                      <a
                        href={`https://zalo.me/0966201140?message=${encodeURIComponent("Tôi muốn mua: " + prod.name + " - " + prod.price + "đ")}`}
                        target="_blank" rel="noopener noreferrer" className="btn btn-primary w-100"
                      >
                        <i className="fas fa-shopping-cart me-2"></i> Đặt hàng ngay
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12 text-center py-5">
              <i className="fas fa-search fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Không tìm thấy sản phẩm phù hợp</h5>
              <a href="https://zalo.me/0966201140" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <i className="fas fa-phone me-2"></i> Tư vấn miễn phí
              </a>
            </div>
          )}
        </div>

        <div className="text-center mt-5">
          <div className="alert alert-info">
            <h6 className="fw-bold mb-2">💡 Cần tư vấn chọn trang gạt phù hợp?</h6>
            <p className="mb-3">Hãy cho chúng tôi biết loại máy và nhu cầu để được tư vấn chính xác nhất!</p>
            <a href="https://zalo.me/0966201140" target="_blank" rel="noopener noreferrer" className="btn btn-success btn-lg">
              <i className="fas fa-comments me-2"></i> Tư vấn miễn phí
            </a>
          </div>
        </div>
      </div>

      {modalImage && <ImageModal src={modalImage} onClose={() => setModalImage(null)} />}
    </section>
  );
}

// ================== SPARE PARTS COMPONENT ==================
function SparePartsComponent() {
  const spareParts = [
    { id: 1, name: "Bộ nối nhanh", price: "400.000", image: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760870151/9-1_n%E1%BB%91i_nhanh_KTM_gsouip.jpg", description: "Bộ nối nhanh 3/8 đặc biệt chuyên dùng KTM - Lắp Trên Van KTM 1 đầu đực + 1 đầu cái", category: "Khớp nối" },
    { id: 2, name: "Van chống tụt hình vuông", price: "630.000", image: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760870364/24_Van_ch%E1%BB%91ng_t%E1%BB%A5t_lo%E1%BA%A1i_vu%C3%B4ng_KTM_sdnjcd.jpg", description: "Van chống tụt hình vuông lắp trên 2 đường ống 4 đầu ren ra 1/4 lõm nhật", category: "Xy lanh" },
    { id: 3, name: "Mặt bích chia nhớt máy kéo", price: "460.000", description: "Mặt bích chia nhớt máy kéo", category: "Xy lanh" },
  ];

  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalImage, setModalImage] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchInputRef = useRef(null);

  const categories = ["Tất cả", "Khớp nối", "Xy lanh"];

  const removeAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const getSuggestions = () => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    let filteredByCategory = spareParts;
    if (selectedCategory !== "Tất cả") {
      filteredByCategory = spareParts.filter(part => part.category === selectedCategory);
    }
    const searchNormalized = removeAccents(searchTerm).toLowerCase();
    return filteredByCategory
      .filter(part => {
        const partNameNormalized = removeAccents(part.name).toLowerCase();
        const partDescNormalized = removeAccents(part.description).toLowerCase();
        return partNameNormalized.includes(searchNormalized) || partDescNormalized.includes(searchNormalized);
      })
      .slice(0, 5)
      .map(part => ({ id: part.id, name: part.name, price: part.price, category: part.category }));
  };

  const suggestions = getSuggestions();

  const filteredParts = spareParts.filter(part => {
    const matchesCategory = selectedCategory === "Tất cả" || part.category === selectedCategory;
    if (!searchTerm || searchTerm.trim().length === 0) return matchesCategory;
    const searchNormalized = removeAccents(searchTerm).toLowerCase();
    const partNameNormalized = removeAccents(part.name).toLowerCase();
    const partDescNormalized = removeAccents(part.description).toLowerCase();
    const matchesSearch = partNameNormalized.includes(searchNormalized) || partDescNormalized.includes(searchNormalized);
    return matchesCategory && matchesSearch;
  });

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowSuggestions(e.target.value.length >= 2);
    setSelectedSuggestionIndex(-1);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.name);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  return (
    <section className="py-5 bg-white">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="fw-bold text-primary mb-3">🔧 PHỤ TÙNG THỦY LỰC KTM</h2>
          <p className="text-muted">Cung cấp đầy đủ phụ tùng thủy lực chính hãng, chất lượng cao</p>
        </div>

        <div className="row mb-4">
          <div className="col-md-6 mb-3">
            <div className="input-group position-relative">
              <span className="input-group-text"><i className="fas fa-search"></i></span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control"
                placeholder="Tìm kiếm phụ tùng..."
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
              />

              {searchTerm.length >= 2 && suggestions.length > 0 && showSuggestions && (
                <div className="suggestions-dropdown" style={{
                  position: 'absolute', top: '100%', left: '0', right: '0',
                  background: 'white', border: '2px solid #007bff', borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 99999, marginTop: '5px'
                }}>
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion.id}-${index}`}
                      className={`suggestion-item ${index === selectedSuggestionIndex ? 'active' : ''}`}
                      onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(suggestion); }}
                      style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none' }}
                    >
                      <div className="fw-semibold text-primary">{suggestion.name}</div>
                      <div className="text-muted small">{suggestion.category}</div>
                      <div className="text-success fw-bold">{suggestion.price}₫</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="col-md-6">
            <select className="form-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </div>

        <div className="row">
          {filteredParts.map(part => (
            <div key={part.id} className="col-lg-4 col-md-6 mb-4">
              <div className="card h-100 shadow-sm border-0">
                {part.image && (
                  <div className="card-img-top-container" style={{ height: '200px', overflow: 'hidden' }}>
                    <img src={part.image} className="card-img-top h-100 w-100" style={{ objectFit: 'cover', cursor: 'pointer' }} alt={part.name} onClick={() => setModalImage(part.image)} />
                  </div>
                )}
                <div className="card-body d-flex flex-column">
                  <div className="mb-2"><span className="badge bg-primary">{part.category}</span></div>
                  <h5 className="card-title text-primary fw-bold">{part.name}</h5>
                  <p className="card-text text-muted small flex-grow-1">{part.description}</p>
                  <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="h5 text-success fw-bold mb-0">{part.price}₫</span>
                    </div>
                    <div className="d-grid gap-2">
                      <a href={`https://zalo.me/0966201140?text=Tôi quan tâm đến ${part.name} - ${part.price}₫`} target="_blank" rel="noopener noreferrer" className="btn btn-success">
                        <i className="fas fa-shopping-cart me-2"></i> Đặt hàng ngay
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredParts.length === 0 && (
          <div className="text-center py-5">
            <i className="fas fa-search fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Không tìm thấy phụ tùng phù hợp</h5>
            <a href="https://zalo.me/0966201140" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <i className="fas fa-phone me-2"></i> Liên hệ tư vấn
            </a>
          </div>
        )}

        <div className="text-center mt-5">
          <div className="alert alert-info">
            <h6 className="fw-bold mb-2">💡 Cần tư vấn chọn phụ tùng phù hợp?</h6>
            <p className="mb-3">Chúng tôi có đội ngũ kỹ thuật chuyên nghiệp, sẵn sàng tư vấn miễn phí!</p>
            <a href="https://zalo.me/0966201140" target="_blank" rel="noopener noreferrer" className="btn btn-success btn-lg">
              <i className="fas fa-comments me-2"></i> Tư vấn miễn phí
            </a>
          </div>
        </div>
      </div>

      {modalImage && <ImageModal src={modalImage} onClose={() => setModalImage(null)} />}
    </section>
  );
}

// ================== MAIN APP COMPONENT ==================
function App() {
  const [showShortsModal, setShowShortsModal] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);

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
      <HydraulicBladeProducts />
      <ProductList />
      {/* <ProductShowcaseTabs /> */}
      {/* <ProductVanTay /> */}
      {/* <SparePartsComponent /> */}
      <AlbumGallery />
      <InstructionVideos />
      {/* <YoutubeShortsSection onOpen={() => setShowShortsModal(true)} /> */}
      {showShortsModal && <YoutubeShortsModal onClose={() => setShowShortsModal(false)} />}
      {showAiChat && <AiChatWidget onClose={() => setShowAiChat(false)} />}
      <FloatingSocial onOpenAiChat={() => setShowAiChat(true)} />
      <FooterCompany />
    </>
  );
}

// ================== RENDER APP ==================
ReactDOM.render(<App />, document.getElementById("root"));
