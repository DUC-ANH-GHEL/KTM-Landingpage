                                toggleSavedSearch(paletteQuery);
                              }}
                            >
                              <i className={`fas fa-star${savedSearches.includes(paletteQuery) ? '' : '-o'}`}></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {paletteQuery.trim() && searchResults.length === 0 && (
                    <div className="palette-empty">
                      <i className="fas fa-search"></i>
                      <p>Không tìm thấy kết quả cho "{paletteQuery}"</p>
                    </div>
                  )}
                </div>
                
                <div className="palette-footer">
                  <span><kbd>Esc</kbd> để đóng</span>
                  <span><kbd>Enter</kbd> để lưu vào lịch sử</span>
                </div>
              </div>
            </div>
          )}

          {/* ========== AI CHAT BUTTON ========== */}
          <button
            className="btn btn-lg rounded-circle position-fixed shadow-lg"
            style={{ 
              bottom: fabOpen ? 320 : 130, 
              right: 16, 
              width: 56, 
              height: 56, 
              zIndex: 1050,
              transition: 'bottom 0.2s ease',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#fff',
              border: 'none',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              cursor: 'pointer',
              outline: 'none'
            }}
            onClick={() => setShowAIChat(true)}
            onTouchStart={() => setShowAIChat(true)}
          >
            <i className="fas fa-robot fa-lg"></i>
          </button>

          {/* ========== AI CHAT FULLSCREEN (MOBILE) ========== */}
          {showAIChat && (
            <div className="ai-chat-mobile">
              <div className="chat-header">
                <button className="back-btn" onClick={() => setShowAIChat(false)}>
                  <i className="fas fa-arrow-left"></i>
                </button>
                <div>
                  <strong>KTM AI Assistant</strong>
                  <div style={{fontSize: 11, opacity: 0.8}}>Hỏi về sản phẩm, giá cả...</div>
                </div>
              </div>
              
              <div className="chat-messages">
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`mb-3 ${msg.role === 'user' ? 'd-flex justify-content-end' : ''}`}>
                    <div 
                      className={`p-3 rounded-3 position-relative ${msg.role === 'user' ? 'text-white' : 'bg-white border'}`}
                      style={{ 
                        maxWidth: '85%', 
                        whiteSpace: 'pre-wrap',
                        background: msg.role === 'user' ? 'linear-gradient(135deg, #667eea, #764ba2)' : undefined
                      }}
                    >
                      {msg.content}
                      
                      {/* Copy button for bot messages */}
                      {msg.role === 'assistant' && (
                        <button
                          className="btn btn-sm position-absolute"
                          style={{
                            top: 4,
                            right: 4,
                            padding: '2px 6px',
                            fontSize: 11,
                            background: copiedId === `chat-${i}` ? '#28a745' : 'rgba(0,0,0,0.1)',
                            border: 'none',
                            borderRadius: 4,
                            color: copiedId === `chat-${i}` ? '#fff' : '#666'
                          }}
                          onClick={() => {
                            window.KTM.clipboard.writeText(msg.content);
                            setCopiedId(`chat-${i}`);
                            setTimeout(() => setCopiedId(null), 1500);
                          }}
                        >
                          <i className={`fas ${copiedId === `chat-${i}` ? 'fa-check' : 'fa-copy'}`}></i>
                        </button>
                      )}
                      
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 d-flex flex-wrap gap-2">
                          {msg.attachments.map((att, idx) => (
                            <div key={idx} style={{width: 70}} className="text-center">
                              {att.image && (
                                <img 
                                  src={att.image} 
                                  className="rounded"
                                  style={{width: 70, height: 50, objectFit: 'cover', cursor: 'pointer'}}
                                  onClick={() => setPreviewImage({ url: att.image, name: att.name, price: att.price })}
                                />
                              )}
                              <div style={{fontSize: 9}} className="text-truncate">{att.name}</div>
                              {att.price && <div style={{fontSize: 10, color: '#dc3545', fontWeight: 600}}>{att.price.replace(/[đ\s]/g, '')}đ</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="mb-3">
                    <div className="bg-white border p-3 rounded-3 d-inline-block">
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Đang suy nghĩ...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}></div>
              </div>
              
              {/* Quick suggestions */}
              <div className="px-3 py-2 border-top d-flex gap-2 overflow-auto">
                {['Giá van 2 tay?', 'Combo rẻ nhất?', 'Freeship?', 'Van 3 tay?'].map(q => (
                  <button
                    key={q}
                    className="btn btn-sm btn-outline-secondary flex-shrink-0"
                    onClick={() => handleAIChat(q)}
                    disabled={aiLoading}
                    style={{whiteSpace: 'nowrap'}}
                  >
                    {q}
                  </button>
                ))}
              </div>
              
              <div className="chat-input-area">
                <form onSubmit={(e) => { e.preventDefault(); handleAIChat(aiInput); }} className="chat-input-wrap">
                  <input
                    ref={aiInputRef}
                    type="text"
                    className="chat-input"
                    placeholder="Nhập câu hỏi..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    disabled={aiLoading}
                  />
                  <button type="submit" className="send-btn" disabled={aiLoading || !aiInput.trim()}>
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========== IMAGE PREVIEW MODAL ========== */}
          {previewImage && (
            <div className="preview-modal" onClick={() => setPreviewImage(null)}>
              <div className="preview-header">
                <div></div>
                <button className="close-btn" onClick={() => setPreviewImage(null)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="preview-body" onClick={(e) => e.stopPropagation()}>
                <img src={previewImage.url} alt={previewImage.name} />
              </div>
              
              <div className="preview-footer" onClick={(e) => e.stopPropagation()}>
                <div className="name">{previewImage.name}</div>
                {previewImage.price && <div className="price">{previewImage.price.replace(/[đ\s]/g, '')}đ</div>}
                {previewImage.note && <div className="mb-2" style={{fontSize: 14, color: '#17a2b8'}}>{previewImage.note}</div>}
                
                <div className="action-btns">
                  <button 
                    className={copiedId === 'preview-img' ? 'btn-success text-white' : 'btn-outline-light text-white'}
                    style={{background: copiedId === 'preview-img' ? '#28a745' : 'rgba(255,255,255,0.2)'}}
                    onClick={() => copyImage(previewImage.url, 'preview')}
                  >
                    <i className={`fas ${copiedId === 'preview-img' ? 'fa-check' : 'fa-copy'}`}></i>
                    Copy ảnh
                  </button>
                  {previewImage.price && (
                    <button 
                      className={copiedId === 'preview-price' ? 'btn-success text-white' : 'btn-warning'}
                      onClick={() => copyText(previewImage.price.replace(/[đ\s]/g, ''), 'preview-price')}
                    >
                      <i className={`fas ${copiedId === 'preview-price' ? 'fa-check' : 'fa-tag'}`}></i>
                      Copy giá
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Product Modal for FAB */}
          <ProductModal
            show={showProductModal}
            product={editingProduct}
            categories={categories}
            onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
            onSave={handleSaveProduct}
          />

      {/* ========== FAB - FLOATING ACTION BUTTON ========== */}
          <div className={`fab-container mobile-only ${fabOpen ? 'open' : ''}`}>
            <div className="fab-actions">
              <button 
                className="fab-action product"
                onClick={() => { setFabOpen(false); setShowProductModal(true); setEditingProduct(null); }}
              >
                <i className="fas fa-box"></i>
                <span className="tooltip">Thêm sản phẩm</span>
              </button>
                  <button 
                    className="fab-action product"
                    onClick={() => { setFabOpen(false); onNavigate && onNavigate('orders', 'create'); }}
                  >
                    <i className="fas fa-receipt"></i>
                    <span className="tooltip">Tạo order nhanh</span>
                  </button>
            </div>
            <button 
              className={`fab-main ${fabOpen ? 'open' : ''}`}
              onClick={() => setFabOpen(!fabOpen)}
            >
              <i className="fas fa-plus"></i>
            </button>
          </div>

          {/* ========== QUICK EDIT MODAL ========== */}
          {showQuickEdit && editingItem && (
            <div className="modal show d-block" style={{background: 'rgba(0,0,0,0.6)'}}>
              <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content" style={{borderRadius: 16, maxHeight: '90vh'}}>
                  <div className="modal-header" style={{background: 'linear-gradient(135deg, #ffc107, #ff9800)', border: 'none'}}>
                    <h6 className="modal-title fw-bold">
                      <i className="fas fa-pen me-2"></i>Sửa nhanh
                    </h6>
                    <button type="button" className="btn-close" onClick={() => setShowQuickEdit(false)}></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Tên sản phẩm</label>
                      <input
                        type="text"
                        className="form-control"
                        value={productForm.name}
                        onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                      />
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label small fw-semibold">Mã SP</label>
                        <input
                          type="text"
                          className="form-control"
                          value={productForm.code}
                          onChange={(e) => setProductForm({...productForm, code: e.target.value})}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-semibold">Giá</label>
                        <input
                          type="text"
                          className="form-control"
                          value={productForm.price}
                          onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Hoa hồng (%)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={productForm.commission_percent}
                        min={0}
                        max={100}
                        step={0.01}
                        placeholder="5"
                        onChange={(e) => setProductForm({...productForm, commission_percent: e.target.value})}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Danh mục</label>
                      <select
                        className="form-select"
                        value={productForm.category}
                        onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                      >
                        <option value="">-- Chọn danh mục --</option>
                        {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Ghi chú (ưu đãi)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={productForm.note}
                        placeholder="VD: Free ship, Giảm 10%..."
                        onChange={(e) => setProductForm({...productForm, note: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowQuickEdit(false)}>
                      Hủy
                    </button>
                    <button type="button" className="btn btn-warning" onClick={handleSaveQuickEdit}>
                      <i className="fas fa-save me-1"></i>Lưu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

