    // ==================== VIDEO MANAGEMENT ====================
    
    // Video List View - với nút sắp xếp mobile-friendly
    function VideoList({ onRefresh, showToast }) {
      const [folders, setFolders] = useState([]);
      const [videos, setVideos] = useState([]);
      const [loading, setLoading] = useState(true);
      const [selectedFolder, setSelectedFolder] = useState(null);
      const [showFolderModal, setShowFolderModal] = useState(false);
      const [editingFolder, setEditingFolder] = useState(null);
      const [showVideoModal, setShowVideoModal] = useState(false);
      const [editingVideo, setEditingVideo] = useState(null);
      
      // Video inspector drawer states
      const [videoInspectorOpen, setVideoInspectorOpen] = useState(false);
      const [videoInspectorItem, setVideoInspectorItem] = useState(null);
      const [videoInspectorEditMode, setVideoInspectorEditMode] = useState(false);
      
      // Video folder inspector drawer states
      const [folderInspectorOpen, setFolderInspectorOpen] = useState(false);
      const [folderInspectorItem, setFolderInspectorItem] = useState(null);
      const [folderInspectorEditMode, setFolderInspectorEditMode] = useState(false);
      
      // Nested folder navigation
      const [currentParentFolder, setCurrentParentFolder] = useState(null);
      const [folderBreadcrumb, setFolderBreadcrumb] = useState([]);

      useEffect(() => {
        loadFolders();
      }, []);

      const loadFolders = async (parentId = null) => {
        setLoading(true);
        try {
          const url = parentId
            ? `${API_BASE}/api/video-folders?withVideos=true&parent_id=${parentId}`
            : `${API_BASE}/api/video-folders?withVideos=true&parent_id=root`;
          const data = await window.KTM.api.getJSON(url, 'Lỗi tải danh sách folder');
          setFolders(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error(err);
          showToast('Lỗi tải danh sách folder', 'danger');
        }
        setLoading(false);
      };

      const loadVideosInFolder = async (folderId) => {
        try {
          const data = await window.KTM.api.getJSON(
            `${API_BASE}/api/videos?folderId=${folderId}`,
            'Lỗi tải video'
          );
          setVideos(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error(err);
        }
      };

      // Move folder up/down (mobile-friendly reordering)
      const moveFolderUp = async (index) => {
        if (index === 0) return;
        const newFolders = [...folders];
        [newFolders[index - 1], newFolders[index]] = [newFolders[index], newFolders[index - 1]];
        setFolders(newFolders);
        await saveFolderOrder(newFolders);
      };

      const moveFolderDown = async (index) => {
        if (index === folders.length - 1) return;
        const newFolders = [...folders];
        [newFolders[index], newFolders[index + 1]] = [newFolders[index + 1], newFolders[index]];
        setFolders(newFolders);
        await saveFolderOrder(newFolders);
      };

      const saveFolderOrder = async (orderedFolders) => {
        try {
          await Promise.all(
            orderedFolders.map((folder, idx) =>
              window.KTM.api.putJSON(
                `${API_BASE}/api/video-folders/${folder.id}`,
                { sortOrder: idx },
                'Lỗi cập nhật thứ tự'
              )
            )
          );
          showToast('Đã cập nhật thứ tự!', 'success');
        } catch (err) {
          showToast('Lỗi cập nhật thứ tự', 'danger');
          loadFolders(currentParentFolder?.id);
        }
      };

      // Move video up/down (mobile-friendly reordering)
      const moveVideoUp = async (index) => {
        if (index === 0) return;
        const newVideos = [...videos];
        [newVideos[index - 1], newVideos[index]] = [newVideos[index], newVideos[index - 1]];
        setVideos(newVideos);
        await saveVideoOrder(newVideos);
      };

      const moveVideoDown = async (index) => {
        if (index === videos.length - 1) return;
        const newVideos = [...videos];
        [newVideos[index], newVideos[index + 1]] = [newVideos[index + 1], newVideos[index]];
        setVideos(newVideos);
        await saveVideoOrder(newVideos);
      };

      const saveVideoOrder = async (orderedVideos) => {
        try {
          await Promise.all(
            orderedVideos.map((video, idx) =>
              window.KTM.api.putJSON(
                `${API_BASE}/api/videos/${video.id}`,
                { sort_order: idx },
                'Lỗi cập nhật thứ tự'
              )
            )
          );
          showToast('Đã cập nhật thứ tự!', 'success');
        } catch (err) {
          showToast('Lỗi cập nhật thứ tự', 'danger');
          loadVideosInFolder(selectedFolder.id);
        }
      };

      // Folder handlers
      const handleCreateFolder = () => {
        setEditingFolder(null);
        setShowFolderModal(true);
      };

      const handleEditFolder = (folder) => {
        setFolderInspectorItem(folder);
        setFolderInspectorOpen(true);
        setFolderInspectorEditMode(true);
      };

      const handleSaveFolder = async (formData, origin = 'modal') => {
        try {
          // Add parent_id if we're in a subfolder
          if (!editingFolder && currentParentFolder) {
            formData.parent_id = currentParentFolder.id;
          }
          
          const url = editingFolder 
            ? `${API_BASE}/api/video-folders/${editingFolder.id}`
            : `${API_BASE}/api/video-folders`;
          if (editingFolder) {
            await window.KTM.api.putJSON(url, formData, 'Lỗi lưu folder');
          } else {
            await window.KTM.api.postJSON(url, formData, 'Lỗi lưu folder');
          }

          showToast(editingFolder ? 'Đã cập nhật folder!' : 'Đã tạo folder mới!', 'success');
          
          if (origin === 'drawer') {
            // Keep drawer open, exit edit mode
            setFolderInspectorEditMode(false);
            setEditingFolder(null);
            loadFolders(currentParentFolder?.id);
            if (editingFolder && folderInspectorItem) {
              setFolderInspectorItem({...folderInspectorItem, ...formData});
            }
          } else {
            // Modal: close modal
            setShowFolderModal(false);
            setEditingFolder(null);
            loadFolders(currentParentFolder?.id);
          }
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };

      const handleDeleteFolder = async (folder) => {
        const msg = folder.subfolderCount > 0
          ? `Xóa folder "${folder.name}"? Tất cả subfolder và videos bên trong sẽ bị xóa!`
          : `Xóa folder "${folder.name}"? Videos trong folder sẽ không bị xóa.`;
        if (!confirm(msg)) return;

        try {
          await window.KTM.api.deleteJSON(
            `${API_BASE}/api/video-folders/${folder.id}`,
            'Lỗi xóa folder'
          );
          showToast('Đã xóa folder', 'success');
          setSelectedFolder(null);
          loadFolders(currentParentFolder?.id);
        } catch (err) {
          showToast('Lỗi xóa folder', 'danger');
        }
      };

      const handleSelectFolder = (folder) => {
        // If folder has subfolders, navigate into it
        if (folder.subfolderCount > 0) {
          setFolderBreadcrumb(prev => [...prev, folder]);
          setCurrentParentFolder(folder);
          loadFolders(folder.id);
        } else {
          // Show videos in folder
          setSelectedFolder(folder);
          setVideos(folder.videos || []);
        }
      };

      const handleFolderBack = (target) => {
        if (target === 'root') {
          setFolderBreadcrumb([]);
          setCurrentParentFolder(null);
          loadFolders(null);
        } else if (target) {
          const idx = folderBreadcrumb.findIndex(b => b.id === target.id);
          if (idx >= 0) {
            setFolderBreadcrumb(folderBreadcrumb.slice(0, idx + 1));
            setCurrentParentFolder(target);
            loadFolders(target.id);
          }
        } else {
          const newBreadcrumb = [...folderBreadcrumb];
          newBreadcrumb.pop();
          const parentFolder = newBreadcrumb[newBreadcrumb.length - 1] || null;
          setFolderBreadcrumb(newBreadcrumb);
          setCurrentParentFolder(parentFolder);
          loadFolders(parentFolder?.id);
        }
      };

      // Folder inspector drawer functions
      const closeFolderInspector = () => {
        setFolderInspectorOpen(false);
        setFolderInspectorEditMode(false);
        setFolderInspectorItem(null);
      };

      // Video inspector drawer functions
      const closeVideoInspector = () => {
        setVideoInspectorOpen(false);
        setVideoInspectorEditMode(false);
        setVideoInspectorItem(null);
      };

      // Video handlers
      const handleCreateVideo = () => {
        setEditingVideo(null);
        setShowVideoModal(true);
      };

      const handleEditVideo = (video) => {
        setVideoInspectorItem(video);
        setVideoInspectorOpen(true);
        setVideoInspectorEditMode(true);
      };

      const handleSaveVideo = async (formData, origin = 'modal') => {
        try {
          // Add folder_id
          formData.folder_id = selectedFolder?.id;
          
          const url = editingVideo 
            ? `${API_BASE}/api/videos/${editingVideo.id}`
            : `${API_BASE}/api/videos`;

          if (editingVideo) {
            await window.KTM.api.putJSON(url, formData, 'Lỗi lưu video');
          } else {
            await window.KTM.api.postJSON(url, formData, 'Lỗi lưu video');
          }

          showToast(editingVideo ? 'Cập nhật thành công!' : 'Thêm video thành công!', 'success');
          
          if (origin === 'drawer') {
            // Keep drawer open, exit edit mode
            setVideoInspectorEditMode(false);
            setEditingVideo(null);
            loadFolders();
            if (selectedFolder) {
              loadVideosInFolder(selectedFolder.id);
            }
            if (editingVideo && videoInspectorItem) {
              setVideoInspectorItem({...videoInspectorItem, ...formData});
            }
          } else {
            // Modal: close modal
            setShowVideoModal(false);
            setEditingVideo(null);
            loadFolders();
            if (selectedFolder) {
              loadVideosInFolder(selectedFolder.id);
            }
          }
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };

      const handleDeleteVideo = async (video) => {
        if (!confirm(`Xóa video "${video.title}"?`)) return;

        try {
          await window.KTM.api.deleteJSON(`${API_BASE}/api/videos/${video.id}`, 'Lỗi xóa video');
          showToast('Đã xóa video', 'success');
          loadFolders();
          if (selectedFolder) {
            loadVideosInFolder(selectedFolder.id);
          }
        } catch (err) {
          showToast('Lỗi xóa video', 'danger');
        }
      };

      const copyLink = (video) => {
        const url = `https://www.youtube.com/watch?v=${video.youtubeId}`;
        window.KTM.clipboard.writeText(url).then(() => {
          showToast('Đã copy link!', 'success');
        }).catch(() => {
          showToast('Không thể copy link', 'danger');
        });
      };

      // Folder List View
      if (!selectedFolder) {
        return (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center">
                {currentParentFolder && (
                  <button className="btn btn-outline-secondary me-3" onClick={() => handleFolderBack()}>
                    <i className="fas fa-arrow-left"></i>
                  </button>
                )}
                <h4 className="m-0">
                  <i className="fas fa-video me-2 text-warning"></i>
                  {currentParentFolder ? currentParentFolder.name : 'Quản lý Video'}
                </h4>
              </div>
              <button className="btn btn-warning" onClick={handleCreateFolder}>
                <i className="fas fa-folder-plus me-2"></i>Tạo Folder
              </button>
            </div>

            {/* Breadcrumb */}
            {folderBreadcrumb.length > 0 && (
              <nav aria-label="breadcrumb" className="mb-3">
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <a href="#" onClick={(e) => { e.preventDefault(); handleFolderBack('root'); }} className="text-warning">
                      <i className="fas fa-home"></i>
                    </a>
                  </li>
                  {folderBreadcrumb.map((item, idx) => (
                    <li key={item.id} className={`breadcrumb-item ${idx === folderBreadcrumb.length - 1 ? 'active' : ''}`}>
                      {idx === folderBreadcrumb.length - 1 ? (
                        item.name
                      ) : (
                        <a href="#" onClick={(e) => { e.preventDefault(); handleFolderBack(item); }} className="text-warning">
                          {item.name}
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            <p className="text-muted small mb-3">
              <i className="fas fa-info-circle me-1"></i>
              Dùng nút ↑↓ để sắp xếp thứ tự. Click vào folder để vào bên trong.
            </p>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-warning"></div>
              </div>
            ) : folders.length === 0 ? (
              <div className="text-center py-5">
                <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
                <p className="text-muted">{currentParentFolder ? 'Folder này đang trống' : 'Chưa có folder video nào'}</p>
                <button className="btn btn-warning" onClick={handleCreateFolder}>
                  <i className="fas fa-plus me-2"></i>Tạo folder{currentParentFolder ? ' con' : ' đầu tiên'}
                </button>
              </div>
            ) : (
              <div className="row g-3">
                {folders.map((folder, index) => (
                  <div key={folder.id} className="col-6 col-md-4 col-lg-3">
                    <div className="card h-100 folder-card">
                      <div className="card-header bg-transparent py-1 d-flex justify-content-center gap-1">
                        <button 
                          className="btn btn-sm btn-outline-secondary px-2 py-0" 
                          onClick={(e) => { e.stopPropagation(); moveFolderUp(index); }}
                          disabled={index === 0}
                          title="Di chuyển lên"
                        >
                          <i className="fas fa-chevron-up"></i>
                        </button>
                        <span className="text-muted small px-1">{index + 1}</span>
                        <button 
                          className="btn btn-sm btn-outline-secondary px-2 py-0" 
                          onClick={(e) => { e.stopPropagation(); moveFolderDown(index); }}
                          disabled={index === folders.length - 1}
                          title="Di chuyển xuống"
                        >
                          <i className="fas fa-chevron-down"></i>
                        </button>
                      </div>
                      <div 
                        className="card-body text-center py-3"
                        onClick={() => handleSelectFolder(folder)}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className={`fas fa-folder fa-3x mb-3 ${folder.slug === 'shorts' ? 'text-danger' : 'text-warning'}`}></i>
                        <h5 className="card-title">{folder.name}</h5>
                        <p className="text-muted mb-0">
                          {folder.subfolderCount > 0 && (
                            <span><i className="fas fa-folder me-1"></i>{folder.subfolderCount} folder</span>
                          )}
                          {folder.subfolderCount > 0 && (folder.videoCount > 0 || folder.videos?.length > 0) && ' • '}
                          {(folder.videoCount > 0 || folder.videos?.length > 0) && (
                            <span><i className="fas fa-video me-1"></i>{folder.videoCount || folder.videos?.length || 0} videos</span>
                          )}
                          {folder.subfolderCount === 0 && !folder.videoCount && !folder.videos?.length && 'Trống'}
                        </p>
                      </div>
                      <div className="card-footer bg-transparent border-0">
                        <div className="btn-group btn-group-sm w-100">
                          <button className="btn btn-outline-secondary" onClick={(e) => { e.stopPropagation(); handleEditFolder(folder); }}>
                            <i className="fas fa-edit"></i> Sửa
                          </button>
                          <button className="btn btn-outline-danger" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}>
                            <i className="fas fa-trash"></i> Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <VideoFolderModal
              show={showFolderModal}
              folder={editingFolder}
              onClose={() => setShowFolderModal(false)}
              onSave={handleSaveFolder}
            />
          </div>
        );
      }

      // Video List in Folder
      return (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center">
              <button className="btn btn-outline-secondary me-3" onClick={() => setSelectedFolder(null)}>
                <i className="fas fa-arrow-left"></i>
              </button>
              <h4 className="m-0">
                <i className={`fas fa-folder-open me-2 ${selectedFolder.slug === 'shorts' ? 'text-danger' : 'text-warning'}`}></i>
                {selectedFolder.name}
              </h4>
            </div>
            <button className="btn btn-warning" onClick={handleCreateVideo}>
              <i className="fas fa-plus me-2"></i>Thêm Video
            </button>
          </div>

          <p className="text-muted small mb-3">
            <i className="fas fa-info-circle me-1"></i>
            Dùng nút ↑↓ để sắp xếp thứ tự videos
          </p>

          {videos.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-video fa-3x text-muted mb-3"></i>
              <p className="text-muted">Chưa có video trong folder này</p>
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
