// components/GlobalSearchBar.js
// Thanh tìm kiếm tổng cho toàn trang

function GlobalSearchBar() {
  const { useState, useEffect, useRef } = React;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [modalImage, setModalImage] = useState(null);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  const inputRef = useRef(null);

  // Load products từ API khi component mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          setAllProducts(data.map(p => ({
            id: p.id,
            name: p.name,
            code: p.code || '',
            price: p.price || '',
            image: p.image || '',
            category: p.category || '',
            note: p.note || ''
          })));
        }
      } catch (e) {
        console.error('Error loading products:', e);
      }
    };
    loadProducts();
  }, []);

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
    setSuppressSuggestions(false);
  };

  // Debounced suggestion computation
  useEffect(() => {
    const minLen = 1;
    if (suppressSuggestions) return;
    if (!searchTerm || searchTerm.trim().length < minLen) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const handler = setTimeout(() => {
      const normalizedQuery = removeAccents(searchTerm.trim());
      const keywords = normalizedQuery.split(/\s+/).filter(Boolean);

      // Tính điểm ưu tiên cho mỗi sản phẩm
      const scoredResults = allProducts.map((prod) => {
        const name = removeAccents(prod.name || "");
        const code = removeAccents(prod.code || "");
        const category = removeAccents(prod.category || "");
        const searchable = `${name} ${code} ${category}`;

        // Kiểm tra có match không
        let isMatch = false;
        if (keywords.length === 1) {
          isMatch = searchable.includes(keywords[0]);
        } else {
          isMatch = keywords.every((kw) => searchable.includes(kw));
        }

        if (!isMatch) return null;

        // Tính điểm ưu tiên (cao hơn = tốt hơn)
        let score = 0;

        // 1. Khớp chính xác toàn bộ query trong tên: +1000
        if (name.includes(normalizedQuery)) {
          score += 1000;
        }

        // 2. Tên bắt đầu bằng query: +500
        if (name.startsWith(normalizedQuery)) {
          score += 500;
        }

        // 3. Tên bắt đầu bằng từ khóa đầu tiên: +200
        if (name.startsWith(keywords[0])) {
          score += 200;
        }

        // 4. Mỗi từ khóa xuất hiện trong tên: +50
        keywords.forEach((kw) => {
          if (name.includes(kw)) score += 50;
        });

        // 5. Khớp mã sản phẩm: +100
        if (code && code.includes(normalizedQuery)) {
          score += 100;
        }

        // 6. Tên ngắn hơn thường chính xác hơn: +bonus nhỏ
        score += Math.max(0, 50 - name.length);

        // 7. Vị trí xuất hiện của query trong tên (càng đầu càng tốt)
        const pos = name.indexOf(normalizedQuery);
        if (pos >= 0) {
          score += Math.max(0, 100 - pos * 5);
        }

        return { ...prod, _score: score };
      }).filter(Boolean);

      // Sắp xếp theo điểm giảm dần
      scoredResults.sort((a, b) => b._score - a._score);

      setSuggestions(scoredResults);
      setShowSuggestions(scoredResults.length > 0);
    }, 120);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Compute fixed position for dropdown
  useEffect(() => {
    if (!inputRef.current || suggestions.length === 0) {
      setDropdownStyle({});
      return;
    }

    const updatePos = () => {
      const rect = inputRef.current.getBoundingClientRect();
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
    setSuggestions([]);
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
      <div className="container global-search-container">
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
              {showSuggestions && suggestions.length > 0 && (
                <div
                  className="suggestions-dropdown"
                  style={{ ...dropdownStyle, maxHeight: '60vh', overflowY: 'auto', background: '#fff' }}
                >
                  <div className="px-3 py-2 bg-light border-bottom small text-muted">
                    <i className="fas fa-list me-1"></i>
                    Tìm thấy <strong className="text-primary">{suggestions.length}</strong> sản phẩm
                  </div>
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
                </div>
              )}
            </div>

            {/* Kết quả sản phẩm đã chọn */}
            {selectedProduct && (
              <div className="card mt-3 shadow-sm">
                <div className="card-body d-flex flex-column flex-md-row align-items-start gap-3">
                  {selectedProduct.image && (
                    <img 
                      src={selectedProduct.image} 
                      alt={selectedProduct.name} 
                      style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8, cursor: "pointer" }}
                      onClick={() => setModalImage(selectedProduct.image)}
                      title="Click để phóng to ảnh"
                    />
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

            {/* Modal phóng to ảnh */}
            {modalImage && (
              <ImageModal src={modalImage} onClose={() => setModalImage(null)} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
