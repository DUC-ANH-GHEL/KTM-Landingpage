                <OrderManager
                  autoOpenCreateToken={orderAutoOpenCreateToken}
                  autoOpenCreateProductId={orderAutoOpenCreateProductId}
                  showToast={showToast}
                />
              )}

              {activeMenu === 'recon' && (
                <ReconExcelManager showToast={showToast} />
              )}

              {activeMenu === 'stats' && (
                <StatsManager />
              )}

              {activeMenu === 'settings' && (
                <SettingsManager />
              )}
            </div>
          </div>

          {/* ========== MOBILE BOTTOM NAVIGATION ========== */}
          <nav className="mobile-bottom-nav">
            <div className="nav-items">
              <a 
                href="#" 
                className={`nav-item ${activeMenu === 'search' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setActiveMenu('search'); }}
              >
                <i className="fas fa-search"></i>
                <span>Tra cứu</span>
              </a>
              <a 
                href="#" 
                className={`nav-item ${activeMenu === 'albums' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setActiveMenu('albums'); setSelectedAlbum(null); }}
              >
                <i className="fas fa-images"></i>
                <span>Album</span>
              </a>
              <a 
                href="#" 
                className={`nav-item ${activeMenu === 'videos' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setActiveMenu('videos'); }}
              >
                <i className="fas fa-video"></i>
                <span>Video</span>
              </a>
              <a 
                href="#" 
                className={`nav-item ${activeMenu === 'products' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setActiveMenu('products'); }}
              >
                <i className="fas fa-box"></i>
                <span>Sản phẩm</span>
              </a>
              <a 
                href="#" 
                className={`nav-item ${activeMenu === 'orders' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setActiveMenu('orders'); }}
              >
                <i className="fas fa-receipt"></i>
                <span>Đơn hàng</span>
              </a>
              <a 
                href="#" 
                className={`nav-item ${activeMenu === 'recon' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setActiveMenu('recon'); }}
              >
                <i className="fas fa-file-excel"></i>
                <span>Đối soát</span>
              </a>
              <a 
                href="#" 
                className={`nav-item ${activeMenu === 'stats' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setActiveMenu('stats'); }}
              >
                <i className="fas fa-chart-column"></i>
                <span>Thống kê</span>
              </a>
            </div>
          </nav>

          <AlbumModal
            show={showAlbumModal}
            album={editingAlbum}
            parentId={currentAlbumFolder?.uuid}
            onClose={() => setShowAlbumModal(false)}
            onSave={handleSaveAlbum}
          />

          <AdminDrawer
            open={albumInspectorOpen}
            title={albumInspectorItem ? albumInspectorItem.title : 'Album'}
            subtitle={albumInspectorItem ? `${albumInspectorItem.subfolderCount || 0} subfolder • ${albumInspectorItem.count || 0} ảnh` : ''}
            onClose={closeAlbumInspector}
            footer={
              albumInspectorEditMode ? (
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      setAlbumInspectorEditMode(false);
                    }}
                  >
                    <i className="fas fa-xmark me-2"></i>Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-warning fw-semibold"
                    onClick={() => {
                      if (albumInspectorItem) {
                        setEditingAlbum(albumInspectorItem);
                        handleSaveAlbum({
                          slug: albumInspectorItem.id || '',
                          title: albumInspectorItem.title || '',
                          description: albumInspectorItem.description || '',
                          cover_url: albumInspectorItem.cover || '',
                          parent_id: albumInspectorItem.parentId || null
                        }, 'drawer');
                      }
                    }}
                  >
                    <i className="fas fa-check me-2"></i>Lưu
                  </button>
                </div>
              ) : albumInspectorItem ? (
                <div className="d-flex flex-wrap gap-2 justify-content-between">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      window.KTM.clipboard.writeText(albumInspectorItem.title);
                      showToast('Đã copy tên folder', 'success');
                    }}
                  >
                    <i className="fas fa-copy me-2"></i>Copy
                  </button>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => editAlbumInspector(albumInspectorItem)}
                    >
                      <i className="fas fa-pen me-2"></i>Sửa
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        if (albumInspectorItem && confirm(`Xóa folder "${albumInspectorItem.title}"?`)) {
                          handleDeleteAlbum(albumInspectorItem);
                          closeAlbumInspector();
                        }
                      }}
                    >
                      <i className="fas fa-trash me-2"></i>Xóa
                    </button>
                  </div>
                </div>
              ) : null
            }
          >
            {albumInspectorEditMode && albumInspectorItem ? (
              <div className="admin-drawer-section">
                <h6><i className="fas fa-pen me-2 text-warning"></i>Chỉnh sửa</h6>
                <div className="mb-3">
                  <label className="form-label">Tên Folder *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={albumInspectorItem.title}
                    onChange={(e) => setAlbumInspectorItem({...albumInspectorItem, title: e.target.value})}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Mô tả</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={albumInspectorItem.description}
                    onChange={(e) => setAlbumInspectorItem({...albumInspectorItem, description: e.target.value})}
                  ></textarea>
                </div>
              </div>
            ) : albumInspectorItem ? (
              <>
                <div className="admin-drawer-section">
                  <h6><i className="fas fa-circle-info me-2 text-warning"></i>Thông tin</h6>
                  <div className="admin-kv">
                    <div className="k">Tên</div>
                    <div className="v">{albumInspectorItem.title}</div>
                    <div className="k">Slug</div>
                    <div className="v font-monospace">{albumInspectorItem.id}</div>
                    <div className="k">Subfolder</div>
                    <div className="v">{albumInspectorItem.subfolderCount || 0}</div>
                    <div className="k">Ảnh</div>
                    <div className="v">{albumInspectorItem.count || 0}</div>
                  </div>
                </div>
                {albumInspectorItem.description && (
                  <div className="admin-drawer-section">
                    <h6><i className="fas fa-note-sticky me-2 text-secondary"></i>Mô tả</h6>
                    <p>{albumInspectorItem.description}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted">Không có dữ liệu</div>
            )}
          </AdminDrawer>

          {/* Toast container */}
          <div className="toast-container">
            {toasts.map(toast => (
              <Toast
                key={toast.id}
                message={toast.message}
                type={toast.type}
                actionLabel={toast.actionLabel}
                onAction={toast.onAction}
                durationMs={toast.durationMs}
                onClose={() => removeToast(toast.id)}
              />
            ))}
          </div>
        </div>
      );
    }

    ReactDOM.render(<AdminApp />, document.getElementById('root'));
