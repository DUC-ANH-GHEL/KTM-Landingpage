                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <i className="fas fa-images fa-2x text-muted mb-2"></i>
                <p className="mb-0">Kéo thả ảnh vào đây hoặc click để chọn</p>
                <small className="text-muted">Hỗ trợ JPG, PNG, WebP</small>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>

              {uploadPreviews.length > 0 && (
                <div className="mt-3">
                  <div className="upload-preview">
                    {uploadPreviews.map((item, index) => (
                      <div key={index} className="upload-preview-item">
                        <img src={item.preview} alt="" />
                        <button className="remove" onClick={() => removeUploadFile(index)}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <button 
                      className="btn btn-warning"
                      onClick={handleUpload}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>{uploadProgress || 'Đang upload...'}</>
                      ) : (
                        <><i className="fas fa-upload me-2"></i>Upload {uploadFiles.length} ảnh</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Image Grid */}
          <div className="card">
            <div className="card-body">
              {/* Header với toolbar khi có ảnh được chọn */}
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <h6 className="m-0"><i className="fas fa-th me-2"></i>Ảnh ({images.length})</h6>
                  {images.length > 0 && (
                    <button 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={selectAllImages}
                    >
                      {selectedImages.length === images.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                    </button>
                  )}
                </div>
                
                {/* Toolbar hiện khi có ảnh được chọn */}
                {selectedImages.length > 0 && (
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="badge bg-primary">{selectedImages.length} đã chọn</span>
                    <button 
                      className="btn btn-sm btn-info"
                      onClick={() => setShowMoveModal(true)}
                    >
                      <i className="fas fa-folder-open me-1"></i>Di chuyển
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={bulkDeleteImages}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <span className="spinner-border spinner-border-sm"></span>
                      ) : (
                        <><i className="fas fa-trash me-1"></i>Xóa</>
                      )}
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setSelectedImages([])}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                )}
              </div>
              
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-warning"></div>
                </div>
              ) : images.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-image fa-2x mb-2"></i>
                  <p>Chưa có ảnh nào trong album này</p>
                </div>
              ) : (
                <div className="image-grid">
                  {images.map((img, index) => (
                    <div 
                      key={index} 
                      className={`image-item ${selectedImages.includes(img.id) ? 'selected' : ''}`}
                      style={{position: 'relative', cursor: 'pointer'}}
                      onClick={() => toggleSelectImage(img.id)}
                    >
                      {/* Checkbox góc trái */}
                      <div 
                        className="select-checkbox"
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          zIndex: 10,
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          background: selectedImages.includes(img.id) ? '#0d6efd' : 'rgba(255,255,255,0.9)',
                          border: selectedImages.includes(img.id) ? 'none' : '2px solid #ccc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }}
                      >
                        {selectedImages.includes(img.id) && (
                          <i className="fas fa-check" style={{color: '#fff', fontSize: '12px'}}></i>
                        )}
                      </div>
                      
                      <img 
                        src={img.src} 
                        alt={img.caption} 
                        style={{
                          opacity: selectedImages.includes(img.id) ? 0.7 : 1,
                          border: selectedImages.includes(img.id) ? '3px solid #0d6efd' : 'none',
                          borderRadius: '8px'
                        }}
                      />
                      
                      {/* Actions - chỉ hiện nút xóa khi hover */}
                      <div className="actions">
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={(e) => { e.stopPropagation(); deleteImage(img.id, index); }}
                          title="Xóa ảnh"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                      
                      {img.caption && (
                        <div className="p-2 bg-light small text-truncate">{img.caption}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Move Image Modal - Dạng cây thư mục */}
          {showMoveModal && (
            <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header bg-info text-white">
                    <h5 className="modal-title">
                      <i className="fas fa-folder-open me-2"></i>
                      Di chuyển {selectedImages.length} ảnh
                    </h5>
                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowMoveModal(false)}></button>
                  </div>
                  <div className="modal-body" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    <p className="text-muted small mb-3">Chọn thư mục đích:</p>
                    
                    {/* Folder Tree */}
                    <div className="folder-tree">
                      {allAlbums.filter(a => !a.parentId).map(folder => (
                        <FolderTreeItem 
                          key={folder.uuid || folder.id}
                          folder={folder}
                          allAlbums={allAlbums}
                          currentAlbumId={album.uuid || album.id}
                          targetAlbum={targetAlbum}
                          onSelect={setTargetAlbum}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setShowMoveModal(false)}
                    >
                      Hủy
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-info"
                      onClick={moveImages}
                      disabled={!targetAlbum || moving}
                    >
                      {moving ? (
                        <><span className="spinner-border spinner-border-sm me-1"></span>Đang chuyển...</>
                      ) : (
                        <><i className="fas fa-check me-1"></i>Di chuyển đến đây</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Image Preview Modal */}
          {previewImage && (
            <div 
              className="modal show d-block" 
              style={{backgroundColor: 'rgba(0,0,0,0.9)'}}
              onClick={() => setPreviewImage(null)}
            >
              <div className="modal-dialog modal-fullscreen d-flex align-items-center justify-content-center">
                <div className="position-relative" style={{maxWidth: '95vw', maxHeight: '95vh'}}>
                  <button 
                    className="btn btn-light position-absolute"
                    style={{top: '-50px', right: '0', borderRadius: '50%', width: '40px', height: '40px'}}
                    onClick={() => setPreviewImage(null)}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                  <img 
                    src={previewImage.src} 
                    alt={previewImage.caption}
                    style={{maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain'}}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {previewImage.caption && (
                    <div className="text-white text-center mt-2">{previewImage.caption}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

