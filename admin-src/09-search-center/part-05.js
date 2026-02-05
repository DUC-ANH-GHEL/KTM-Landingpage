                    >
                      <i className="fas fa-tag"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // List view - detailed cards
        return (
          <div key={item.id || index} className="product-card-mobile">
            {/* Type badge */}
            <span className={`type-badge ${isProduct ? 'product' : isAlbum ? 'album' : 'video'}`}>
              {isProduct ? 'Sản phẩm' : isAlbum ? 'Ảnh' : 'Video'}
            </span>
            
            <div className="card-inner">
              {/* Thumbnail */}
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="thumb"
                  loading="lazy"
                  onClick={() => { trackProductUsage(item, 'preview'); setPreviewImage({ url: item.image, name: item.name, price: item.price, note: item.note, item }); }}
                />
              ) : (
                <div className="thumb d-flex align-items-center justify-content-center bg-light">
                  <i className={`fas ${isVideo ? 'fa-video' : 'fa-image'} fa-2x text-muted`}></i>
                </div>
              )}
              
              {/* Info */}
              <div className="info">
                <div>
                  <div className="name">{item.name}</div>
                  <div className="price-row">
                    {item.price && <span className="price">{item.price.replace(/[đ\s]/g, '')}đ</span>}
                    {hasPromo && <span className="badge-promo">🔥 ƯU ĐÃI</span>}
                  </div>
                  {attributesPreview && (
                    <div style={{ marginTop: 4 }}>
                      {attributesPreview}
                    </div>
                  )}
                  {variantsPreview && (
                    <div style={{ marginTop: 4 }}>
                      {variantsPreview}
                    </div>
                  )}
                </div>
                <div className="meta">
                  {item.code && <span className="meta-tag">#{item.code}</span>}
                  {item.category && <span className="meta-tag">{item.category}</span>}
                  {item.note && <span className="meta-tag highlight">{item.note}</span>}
                  {item.folder && <span className="meta-tag">{item.folder}</span>}
                  {isVideo && <span className="meta-tag"><i className="fab fa-youtube text-danger"></i> Video</span>}
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="quick-actions">
              {isProduct && (
                <button
                  onClick={() => { trackProductUsage(item, 'create_order'); onNavigate && onNavigate('orders', 'create', { productId: item.id }); }}
                >
                  <i className="fas fa-receipt"></i> Tạo đơn
                </button>
              )}
              {/* <button 
                className={copiedId === item.id + '-img' ? 'copied' : ''}
                onClick={() => copyImage(item.image, item.id)}
              >
                <i className="fas fa-image"></i> Ảnh
              </button> */}
              {item.price && (
                <button 
                  className={copiedId === item.id + '-price' ? 'copied' : ''}
                  onClick={() => copyText(item.price.replace(/[đ\s]/g, ''), item.id + '-price', { item, action: 'copy_price' })}
                >
                  <i className="fas fa-tag"></i> Giá
                </button>
              )}
              <button 
                className={copiedId === item.id + '-name' ? 'copied' : ''}
                onClick={() => copyText(item.name, item.id + '-name', { item, action: 'copy_name' })}
              >
                <i className="fas fa-font"></i> Tên
              </button>
              {isVideo && item.youtubeId && (
                <button 
                  className={copiedId === item.id + '-yt' ? 'copied' : ''}
                  onClick={() => copyText(`https://www.youtube.com/watch?v=${item.youtubeId}`, item.id + '-yt')}
                >
                  <i className="fab fa-youtube"></i>
                </button>
              )}
              {/* Edit button - chỉ cho sản phẩm */}
              {isProduct && (
                <button 
                  className="action-edit"
                  onClick={() => handleQuickEdit(item)}
                >
                  <i className="fas fa-pen"></i>
                </button>
              )}
              {/* Delete button */}
              <button 
                className="action-delete"
                onClick={() => handleQuickDelete(item)}
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>
        );
      };

      // State for filter dropdown
      const [showFilter, setShowFilter] = useState(false);

      const quickSuggestionChips = [
        { label: 'van 2 tay', query: 'van 2 tay' },
        { label: 'combo rẻ', query: 'combo rẻ' },
        { label: 'xylanh', query: 'xylanh' },
        { label: 'sdt:…', query: 'sdt:', caret: 'end', addToHistory: false },
        { label: '#mã…', query: '#', caret: 'end', addToHistory: false },
      ];

      return (
        <>
          {/* ========== SMART SUGGESTIONS (MOBILE) ========== */}
          <div className="search-suggestions mobile-only">
            <div className="search-suggestions-section">
              <div className="search-suggestions-label">Gợi ý nhanh</div>
              <div className="search-suggestions-row">
                {quickSuggestionChips.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => applySuggestion(c.query, { caret: c.caret, addToHistory: c.addToHistory, focus: false })}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {popularProductChips.length > 0 && (
              <div className="search-suggestions-section">
                <div className="search-suggestions-label">Sản phẩm hay tìm</div>
                <div className="search-suggestions-row">
                  {popularProductChips.map((r) => {
                    const label = (r.item?.name || r.name || '').trim();
                    if (!label) return null;
                    const code = String(r.item?.code || r.code || '').trim();
                    const q = code ? `#${code}` : label;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        className="suggestion-chip suggestion-chip-popular"
                        onClick={() => {
                          if (r.item) trackProductUsage(r.item, 'suggestion');
                          applySuggestion(q, { caret: 'end', focus: false });
                        }}
                        title={code ? `#${code}` : label}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {popularQueryChips.length > 0 && (
              <div className="search-suggestions-section">
                <div className="search-suggestions-label">Tìm gần đây / hay dùng</div>
                <div className="search-suggestions-row">
                  {popularQueryChips.map((r) => (
                    <button
                      key={r.q}
                      type="button"
                      className="suggestion-chip suggestion-chip-query"
                      onClick={() => applySuggestion(r.q, { caret: 'end', focus: false })}
                      title={`${r.q} (${r.count})`}
                    >
                      {r.q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========== RESULT HEADER ========== */}
          <div className="result-header">
            <span>
              <strong>{searchResults.length}</strong> kết quả
              {aiSearchEnabled && searchQuery.length >= 3 && (
                <span className="ai-badge ms-2">
                  <i className="fas fa-robot"></i> AI
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="ms-2 badge bg-warning text-dark">
                  {selectedCategory === 'product' ? 'Sản phẩm' : selectedCategory === 'album' ? 'Ảnh' : 'Video'}
                </span>
              )}
            </span>
            <div className="d-flex gap-1 align-items-center">
              {/* View mode */}
              <button 
                className={`btn btn-sm ${viewMode === 'list' ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('list')}
                style={{padding: '4px 8px'}}
              >
                <i className="fas fa-list"></i>
              </button>
              <button 
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('grid')}
                style={{padding: '4px 8px'}}
              >
                <i className="fas fa-th"></i>
              </button>
            </div>
          </div>

          {/* ========== RESULTS ========== */}
          <div className="search-results-area">
            {loading ? (
              <div>
                {/* Skeleton list */}
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="product-card-mobile mb-2" style={{opacity:0.7}}>
                    <div className="card-inner">
                      <div className="thumb bg-light" style={{width:80,height:80,borderRadius:8}}></div>
                      <div className="info" style={{flex:1,minWidth:0}}>
                        <div className="skeleton-box mb-2" style={{height:16,width:'60%',background:'#eee',borderRadius:4}}></div>
                        <div className="skeleton-box mb-1" style={{height:12,width:'40%',background:'#f3f3f3',borderRadius:4}}></div>
                        <div className="skeleton-box" style={{height:10,width:'30%',background:'#f3f3f3',borderRadius:4}}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-search"></i>
                <p>Không tìm thấy "{searchQuery}"</p>
                <button className="btn btn-warning" onClick={() => { setSearchQuery(''); handleSearch(''); }}>
                  Xem tất cả
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="product-grid-mobile">
                {searchResults.map((item, index) => renderMobileCard(item, index))}
              </div>
            ) : (
              <div>
                {searchResults.map((item, index) => renderMobileCard(item, index))}
              </div>
            )}
          </div>

          {/* ========== FILTER DROPDOWN ========== */}
          {showFilter && (
            <div className="filter-dropdown">
              <div className="filter-header">
                <strong>Lọc theo loại</strong>
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowFilter(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="filter-chips">
                <span 
                  className={`filter-chip ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => { filterByCategory('all'); setShowFilter(false); }}
                >
                  Tất cả
                </span>
                <span 
                  className={`filter-chip ${selectedCategory === 'product' ? 'active' : ''}`}
                  onClick={() => { filterByCategory('product'); setShowFilter(false); }}
                >
                  <i className="fas fa-box me-1"></i>Sản phẩm
                </span>
                <span 
                  className={`filter-chip ${selectedCategory === 'album' ? 'active' : ''}`}
                  onClick={() => { filterByCategory('album'); setShowFilter(false); }}
                >
                  <i className="fas fa-images me-1"></i>Ảnh
                </span>
                <span 
                  className={`filter-chip ${selectedCategory === 'video' ? 'active' : ''}`}
                  onClick={() => { filterByCategory('video'); setShowFilter(false); }}
                >
                  <i className="fas fa-video me-1"></i>Video
                </span>
              </div>
              {/* AI Toggle */}
              <div className="mt-3 pt-3 border-top d-flex align-items-center justify-content-between">
                <span>AI Search thông minh</span>
                <div className="form-check form-switch m-0">
                  <input 
                    type="checkbox" 
                    className="form-check-input"
                    checked={aiSearchEnabled} 
                    onChange={(e) => setAiSearchEnabled(e.target.checked)}
                    style={{width: 40, height: 20}}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========== SEARCH BAR BOTTOM ========== */}
          <div className="search-bar-bottom">
            <div className="search-input-wrap">
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="🔍 Tìm: van 3 tay, xylanh... (/ để focus, Ctrl+K palette)"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <button 
                className={`filter-btn ${showFilter || selectedCategory !== 'all' ? 'active' : ''}`}
                onClick={() => setShowFilter(!showFilter)}
              >
                <i className="fas fa-filter"></i>
              </button>
            </div>
          </div>

          {/* ========== B: COMMAND PALETTE OVERLAY ========== */}
          {showPalette && (
            <div className="search-palette-overlay" onClick={() => setShowPalette(false)}>
              <div className="search-palette" onClick={(e) => e.stopPropagation()}>
                <div className="palette-header">
                  <input
                    ref={paletteInputRef}
                    type="text"
                    className="palette-input"
                    placeholder="🔍 Tìm kiếm nâng cao... (filter: ảnh, video; từ khóa...)"
                    value={paletteQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchResults.length > 0) {
                        addToHistory(paletteQuery);
                        setShowPalette(false);
                      } else if (e.key === 'Escape') {
                        setShowPalette(false);
                      }
                    }}
                  />
                  <button className="palette-close" onClick={() => setShowPalette(false)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                
                <div className="palette-body">
                  {/* Filter chips */}
                  <div className="palette-section">
                    <div className="section-label">Loại</div>
                    <div className="filter-chips-row">
                      {['Tất cả', 'Sản phẩm', 'Ảnh', 'Video'].map((label, idx) => (
                        <span
                          key={label}
                          className={`filter-chip ${selectedCategory === ['all', 'product', 'album', 'video'][idx] ? 'active' : ''}`}
                          onClick={() => {
                            filterByCategory(['all', 'product', 'album', 'video'][idx]);
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Saved searches */}
                  {savedSearches.length > 0 && !paletteQuery.trim() && (
                    <div className="palette-section">
                      <div className="section-label">
                        <i className="fas fa-star me-1"></i>Tìm kiếm đã lưu
                      </div>
                      <div className="palette-items">
                        {savedSearches.map((q, idx) => (
                          <div
                            key={idx}
                            className="palette-item"
                            onClick={() => {
                              handleSearch(q);
                              addToHistory(q);
                            }}
                          >
                            <i className="fas fa-star"></i>
                            <span>{q}</span>
                            <button
                              className="unsave-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSavedSearch(q);
                              }}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* History */}
                  {searchHistory.length > 0 && !paletteQuery.trim() && (
                    <div className="palette-section">
                      <div className="section-label">
                        <i className="fas fa-clock me-1"></i>Lịch sử tìm kiếm
                      </div>
                      <div className="palette-items">
                        {searchHistory.map((q, idx) => (
                          <div
                            key={idx}
                            className="palette-item"
                            onClick={() => {
                              handleSearch(q);
                            }}
                          >
                            <i className="fas fa-history"></i>
                            <span>{q}</span>
                            <button
                              className="save-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSavedSearch(q);
                              }}
                            >
                              <i className={`fas fa-star${savedSearches.includes(q) ? '' : '-o'}`}></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Results */}
                  {paletteQuery.trim() && searchResults.length > 0 && (
                    <div className="palette-section">
                      <div className="section-label">Kết quả ({searchResults.length})</div>
                      <div className="palette-items" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {searchResults.slice(0, 8).map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="palette-result-item"
                            onClick={() => {
                              addToHistory(paletteQuery);
                              setShowPalette(false);
                            }}
                          >
                            {item.image && (
                              <img src={item.image} alt={item.name} className="result-thumb" />
                            )}
                            <div className="result-text">
                              <div className="result-name">{item.name}</div>
                              {item.price && <div className="result-meta">{item.price.replace(/[đ\s]/g, '')}đ</div>}
                            </div>
                            <button
                              className="save-btn"
                              onClick={(e) => {
                                e.stopPropagation();