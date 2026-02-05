            </div>
          ) : (
            <div className="row g-4">
              {videos.map((video, index) => (
                <div key={video.id} className="col-6 col-md-4 col-lg-3">
                  <div className="card h-100">
                    <div className="card-header bg-transparent py-1 d-flex justify-content-center gap-1">
                      <button 
                        className="btn btn-sm btn-outline-secondary px-2 py-0" 
                        onClick={() => moveVideoUp(index)}
                        disabled={index === 0}
                        title="Di chuyển lên"
                      >
                        <i className="fas fa-chevron-up"></i>
                      </button>
                      <span className="text-muted small px-1">{index + 1}</span>
                      <button 
                        className="btn btn-sm btn-outline-secondary px-2 py-0" 
                        onClick={() => moveVideoDown(index)}
                        disabled={index === videos.length - 1}
                        title="Di chuyển xuống"
                      >
                        <i className="fas fa-chevron-down"></i>
                      </button>
                    </div>
                    <div className="position-relative">
                      <img 
                        src={video.thumb} 
                        className="card-img-top" 
                        alt={video.title}
                        style={{ height: '120px', objectFit: 'cover' }}
                      />
                      <a 
                        href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                        target="_blank"
                        className="position-absolute top-50 start-50 translate-middle"
                      >
                        <i className="fas fa-play-circle fa-3x text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}></i>
                      </a>
                    </div>
                    <div className="card-body py-2">
                      <h6 className="card-title small mb-1 text-truncate" title={video.title}>{video.title}</h6>
                      <small className="text-muted">{video.youtubeId}</small>
                    </div>
                    <div className="card-footer bg-transparent border-0 pt-0">
                      <div className="btn-group btn-group-sm w-100">
                        <button className="btn btn-outline-primary" onClick={() => copyLink(video)} title="Copy link">
                          <i className="fas fa-link"></i>
                        </button>
                        <button className="btn btn-outline-secondary" onClick={() => handleEditVideo(video)} title="Sửa">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => handleDeleteVideo(video)} title="Xóa">
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <VideoModal
            show={showVideoModal}
            video={editingVideo}
            onClose={() => setShowVideoModal(false)}
            onSave={handleSaveVideo}
          />

          <AdminDrawer
            open={folderInspectorOpen}
            title={folderInspectorItem ? folderInspectorItem.name : 'Folder'}
            subtitle={folderInspectorItem ? `${folderInspectorItem.subfolderCount || 0} subfolder • ${folderInspectorItem.videoCount || 0} videos` : ''}
            onClose={closeFolderInspector}
            footer={
              folderInspectorEditMode ? (
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={closeFolderInspector}
                  >
                    <i className="fas fa-xmark me-2"></i>
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-warning fw-semibold"
                    onClick={() => {
                      if (folderInspectorItem) {
                        handleSaveFolder({
                          name: folderInspectorItem.name || '',
                          description: folderInspectorItem.description || '',
                          sortOrder: folderInspectorItem.sortOrder || 0
                        }, 'drawer');
                      }
                    }}
                  >
                    <i className="fas fa-check me-2"></i>
                    Lưu
                  </button>
                </div>
              ) : folderInspectorItem ? (
                <div className="d-flex flex-wrap gap-2 justify-content-between">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      window.KTM.clipboard.writeText(folderInspectorItem.name);
                      showToast('Đã copy tên folder', 'success');
                    }}
                  >
                    <i className="fas fa-copy me-2"></i>
                    Copy
                  </button>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setFolderInspectorEditMode(true);
                      }}
                    >
                      <i className="fas fa-pen me-2"></i>
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        if (confirm(`Xóa folder "${folderInspectorItem.name}"?`)) {
                          handleDeleteFolder(folderInspectorItem);
                          closeFolderInspector();
                        }
                      }}
                    >
                      <i className="fas fa-trash me-2"></i>
                      Xóa
                    </button>
                  </div>
                </div>
              ) : null
            }
          >
            {folderInspectorEditMode && folderInspectorItem ? (
              <div className="admin-drawer-section">
                <h6>
                  <i className="fas fa-pen me-2 text-warning"></i>
                  Chỉnh sửa
                </h6>
                <div className="mb-3">
                  <label className="form-label">Tên Folder *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={folderInspectorItem.name || ''}
                    onChange={(e) => setFolderInspectorItem({ ...folderInspectorItem, name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Mô tả</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={folderInspectorItem.description || ''}
                    onChange={(e) => setFolderInspectorItem({ ...folderInspectorItem, description: e.target.value })}
                  />
                </div>
              </div>
            ) : folderInspectorItem ? (
              <>
                <div className="admin-drawer-section">
                  <h6>
                    <i className="fas fa-circle-info me-2 text-warning"></i>
                    Thông tin
                  </h6>
                  <div className="admin-kv">
                    <div className="k">Tên</div>
                    <div className="v">{folderInspectorItem.name}</div>
                    <div className="k">Slug</div>
                    <div className="v font-monospace">{folderInspectorItem.id}</div>
                    <div className="k">Subfolder</div>
                    <div className="v">{folderInspectorItem.subfolderCount || 0}</div>
                    <div className="k">Video</div>
                    <div className="v">{folderInspectorItem.videoCount || 0}</div>
                  </div>
                </div>
                {folderInspectorItem.description && (
                  <div className="admin-drawer-section">
                    <h6>
                      <i className="fas fa-note-sticky me-2 text-secondary"></i>
                      Mô tả
                    </h6>
                    <p>{folderInspectorItem.description}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted">Không có dữ liệu</div>
            )}
          </AdminDrawer>

          <AdminDrawer
            open={videoInspectorOpen}
            title={videoInspectorItem ? videoInspectorItem.title : 'Video'}
            subtitle={videoInspectorItem ? `${videoInspectorItem.youtubeId}` : ''}
            onClose={closeVideoInspector}
            footer={
              videoInspectorEditMode ? (
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={closeVideoInspector}
                  >
                    <i className="fas fa-xmark me-2"></i>
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-warning fw-semibold"
                    onClick={() => {
                      if (videoInspectorItem) {
                        handleSaveVideo({
                          youtube_url: `https://www.youtube.com/watch?v=${videoInspectorItem.youtubeId}`,
                          title: videoInspectorItem.title || '',
                          thumbnail_url: videoInspectorItem.thumb || '',
                          sort_order: videoInspectorItem.sortOrder || 0
                        }, 'drawer');
                      }
                    }}
                  >
                    <i className="fas fa-check me-2"></i>
                    Lưu
                  </button>
                </div>
              ) : videoInspectorItem ? (
                <div className="d-flex flex-wrap gap-2 justify-content-between">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      const link = `https://www.youtube.com/watch?v=${videoInspectorItem.youtubeId}`;
                      window.KTM.clipboard.writeText(link).then(() => {
                        showToast('Đã copy link!', 'success');
                      });
                    }}
                  >
                    <i className="fas fa-link me-2"></i>
                    Copy
                  </button>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setVideoInspectorEditMode(true);
                      }}
                    >
                      <i className="fas fa-pen me-2"></i>
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        if (confirm(`Xóa video "${videoInspectorItem.title}"?`)) {
                          handleDeleteVideo(videoInspectorItem);
                          closeVideoInspector();
                        }
                      }}
                    >
                      <i className="fas fa-trash me-2"></i>
                      Xóa
                    </button>
                  </div>
                </div>
              ) : null
            }
          >
            {videoInspectorEditMode && videoInspectorItem ? (
              <div className="admin-drawer-section">
                <h6>
                  <i className="fas fa-pen me-2 text-warning"></i>
                  Chỉnh sửa
                </h6>
                <div className="mb-3">
                  <label className="form-label">Tiêu đề *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={videoInspectorItem.title || ''}
                    onChange={(e) => setVideoInspectorItem({ ...videoInspectorItem, title: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">YouTube ID</label>
                  <input
                    type="text"
                    className="form-control"
                    value={videoInspectorItem.youtubeId || ''}
                    onChange={(e) => setVideoInspectorItem({ ...videoInspectorItem, youtubeId: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Thứ tự</label>
                  <input
                    type="number"
                    className="form-control"
                    value={videoInspectorItem.sortOrder || 0}
                    onChange={(e) => setVideoInspectorItem({ ...videoInspectorItem, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            ) : videoInspectorItem ? (
              <>
                <div className="admin-drawer-section">
                  <h6>
                    <i className="fas fa-circle-info me-2 text-warning"></i>
                    Thông tin
                  </h6>
                  <div className="admin-kv">
                    <div className="k">Tiêu đề</div>
                    <div className="v">{videoInspectorItem.title}</div>
                    <div className="k">YouTube ID</div>
                    <div className="v font-monospace">{videoInspectorItem.youtubeId}</div>
                    <div className="k">Thứ tự</div>
                    <div className="v">{videoInspectorItem.sortOrder || 0}</div>
                  </div>
                </div>
                {videoInspectorItem.thumb && (
                  <div className="admin-drawer-section">
                    <h6>
                      <i className="fas fa-image me-2 text-info"></i>
                      Thumbnail
                    </h6>
                    <img src={videoInspectorItem.thumb} alt={videoInspectorItem.title} className="rounded w-100" style={{ maxHeight: 200, objectFit: 'cover' }} />
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted">Không có dữ liệu</div>
            )}
          </AdminDrawer>
        </div>
      );
    }

    // Video Folder Modal
