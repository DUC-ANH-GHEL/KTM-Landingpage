const { useState, useEffect, useRef } = React;

    // Cloudinary config - Cần tạo unsigned upload preset tên "ktm_unsigned" trên Cloudinary Dashboard
    // Settings -> Upload -> Upload presets -> Add upload preset -> Signing Mode: Unsigned
    const CLOUDINARY_CLOUD_NAME = 'diwxfpt92';
    const CLOUDINARY_UPLOAD_PRESET = 'ktm_unsigned'; 

    // API Base - Vercel dev chạy ở port 3000, dùng chung domain
    const API_BASE = '';

    // ==================== LOGIN COMPONENT ====================
    function LoginPage({ onLogin, error }) {
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const [showPassword, setShowPassword] = useState(false);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onLogin(username, password);
        setLoading(false);
      };

      return (
        <div className="login-page">
          <div className="login-box">
            <div className="text-center mb-4">
              <i className="fas fa-tractor fa-3x text-warning mb-3"></i>
              <h4 className="text-dark">KTM Admin</h4>
              <p className="text-muted small">Đăng nhập để quản lý</p>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small">
                <i className="fas fa-exclamation-circle me-2"></i>{error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small">Tên đăng nhập</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="fas fa-user"></i></span>
                  <input
                    type="text"
                    className="form-control"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small">Mật khẩu</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="fas fa-lock"></i></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-warning w-100"
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Đang đăng nhập...</>
                ) : (
                  <><i className="fas fa-sign-in-alt me-2"></i>Đăng nhập</>
                )}
              </button>
            </form>

            <div className="text-center mt-4">
              <a href="/" className="text-muted small text-decoration-none">
                <i className="fas fa-arrow-left me-1"></i>Về trang chủ
              </a>
            </div>
          </div>
        </div>
      );
    }

    // ==================== COMPONENTS ====================

    // Toast notification
    function Toast({ message, type, onClose }) {
      useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
      }, []);

      return (
        <div className={`toast show align-items-center text-white bg-${type} border-0`} role="alert">
          <div className="d-flex">
            <div className="toast-body">{message}</div>
            <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={onClose}></button>
          </div>
        </div>
      );
    }

    // Loading overlay
    function Loading({ show }) {
      if (!show) return null;
      return (
        <div className="loading-overlay">
          <div className="spinner-border text-warning" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      );
    }

    function AdminDrawer({ open, title, subtitle, onClose, footer, children }) {
      useEffect(() => {
        if (!open) return;
        const onKeyDown = (e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            if (typeof onClose === 'function') onClose();
          }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
      }, [open, onClose]);

      if (!open) return null;

      return (
        <div className={`admin-drawer-root ${open ? 'open' : ''}`} role="dialog" aria-modal="true">
          <div className="admin-drawer-backdrop" onClick={onClose} aria-hidden="true"></div>
          <aside className="admin-drawer-panel">
            <div className="admin-drawer-header">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="admin-drawer-title">{title}</div>
                {subtitle ? <div className="admin-drawer-subtitle">{subtitle}</div> : null}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-light"
                onClick={onClose}
                title="Đóng"
                aria-label="Đóng"
              >
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            <div className="admin-drawer-body">{children}</div>

            {footer ? <div className="admin-drawer-footer">{footer}</div> : null}
          </aside>
        </div>
      );
    }

    // Sidebar
    function Sidebar({ activeMenu, onMenuChange, onLogout, currentUser }) {
      const menus = [
        { id: 'search', icon: 'fa-search', label: 'Tra cứu nhanh', highlight: true },
        { id: 'albums', icon: 'fa-images', label: 'Quản lý Album' },
        { id: 'videos', icon: 'fa-video', label: 'Quản lý Video' },
        { id: 'products', icon: 'fa-box', label: 'Sản phẩm' },
        { id: 'orders', icon: 'fa-receipt', label: 'Quản lý đơn hàng' },
        { id: 'stats', icon: 'fa-chart-column', label: 'Thống kê' },
        { id: 'settings', icon: 'fa-cog', label: 'Cài đặt' },
      ];

      const displayName =
        currentUser?.username || currentUser?.name || currentUser?.email || 'Admin';

      return (
        <div className="sidebar d-none d-md-block">
          <div className="logo">
            <i className="fas fa-tractor me-2"></i> KTM Admin
          </div>

          <div className="sidebar-user" aria-label="Tài khoản">
            <div className="sidebar-user-avatar" aria-hidden="true">
              <i className="fas fa-user"></i>
            </div>
            <div className="sidebar-user-meta">
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-sub">Quản trị</div>
            </div>
          </div>

          <nav className="nav flex-column mt-3">
            {menus.map(menu => (
              <a
                key={menu.id}
                href="#"
                className={`nav-link ${activeMenu === menu.id ? 'active' : ''} ${menu.disabled ? 'opacity-50' : ''} ${menu.highlight ? 'text-warning' : ''}`}
                onClick={(e) => { e.preventDefault(); if (!menu.disabled) onMenuChange(menu.id); }}
              >
                <i className={`fas ${menu.icon}`}></i> {menu.label}
                {menu.disabled && <span className="badge bg-secondary ms-2">Soon</span>}
                {menu.highlight && <span className="badge bg-warning text-dark ms-2">HOT</span>}
              </a>
            ))}
          </nav>
          <div className="position-absolute bottom-0 w-100 p-3 border-top border-secondary">
            <div className="d-flex justify-content-between align-items-center">
              <a href="/" className="text-white-50 text-decoration-none small">
                <i className="fas fa-home me-1"></i> Trang chủ
              </a>
              {onLogout && (
                <button 
                  className="btn btn-sm btn-outline-danger"
                  onClick={onLogout}
                  title="Đăng xuất"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ==================== ADMIN SETTINGS (LOCAL) ====================
    const ADMIN_SETTINGS_STORAGE_KEY = 'ktm_admin_settings_v1';
    const DEFAULT_SHIP_PERCENT = 1.64;

    function normalizeShipPercent(value) {
      const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? '').trim());
      if (!Number.isFinite(parsed)) return DEFAULT_SHIP_PERCENT;
      return Math.max(0, Math.min(100, parsed));
    }

    function loadAdminSettings() {
      try {
        const raw = localStorage.getItem(ADMIN_SETTINGS_STORAGE_KEY);
        if (!raw) return { ship_percent: DEFAULT_SHIP_PERCENT };
        const obj = JSON.parse(raw);
        return {
          ship_percent: normalizeShipPercent(obj?.ship_percent ?? obj?.shipPercent),
        };
      } catch {
        return { ship_percent: DEFAULT_SHIP_PERCENT };
      }
    }

    function saveAdminSettings(next) {
      try {
        const obj = {
          ship_percent: normalizeShipPercent(next?.ship_percent ?? next?.shipPercent),
        };
        localStorage.setItem(ADMIN_SETTINGS_STORAGE_KEY, JSON.stringify(obj));
        return obj;
      } catch {
        return { ship_percent: DEFAULT_SHIP_PERCENT };
      }
    }

    async function fetchAdminSettingsFromServer() {
      const data = await window.KTM.api.getJSON(
        `${API_BASE}/api/settings`,
        'Không tải được cài đặt từ DB'
      );
      return {
        ship_percent: normalizeShipPercent(data?.ship_percent ?? data?.shipPercent),
      };
    }

    async function saveAdminSettingsToServer(next) {
      const payload = {
        ship_percent: normalizeShipPercent(next?.ship_percent ?? next?.shipPercent),
      };
      const data = await window.KTM.api.putJSON(
        `${API_BASE}/api/settings`,
        payload,
        'Không lưu được cài đặt vào DB'
      );
      return {
        ship_percent: normalizeShipPercent(data?.ship_percent ?? data?.shipPercent ?? payload.ship_percent),
      };
    }

    // Album List View - Support nested folders (folder = album, có thể chứa cả ảnh lẫn subfolder)
    function AlbumList({ albums, onSelect, onCreate, onEdit, onDelete, loading, currentFolder, onBack, breadcrumb }) {
      return (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center">
              {currentFolder && (
                <button className="btn btn-outline-secondary me-3" onClick={onBack}>
                  <i className="fas fa-arrow-left"></i>
                </button>
              )}
              <h4 className="m-0">
                <i className="fas fa-folder me-2 text-warning"></i>
                {currentFolder ? currentFolder.title : 'Thư viện ảnh'}
              </h4>
            </div>
            <button className="btn btn-warning" onClick={onCreate}>
              <i className="fas fa-folder-plus me-1"></i>Tạo Folder
            </button>
          </div>

          {/* Breadcrumb */}
          {breadcrumb && breadcrumb.length > 0 && (
            <nav aria-label="breadcrumb" className="mb-3">
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <a href="#" onClick={(e) => { e.preventDefault(); onBack('root'); }} className="text-warning">
                    <i className="fas fa-home"></i>
                  </a>
                </li>
                {breadcrumb.map((item, idx) => (
                  <li key={item.id} className={`breadcrumb-item ${idx === breadcrumb.length - 1 ? 'active' : ''}`}>
                    {idx === breadcrumb.length - 1 ? (
                      item.title
                    ) : (
                      <a href="#" onClick={(e) => { e.preventDefault(); onBack(item); }} className="text-warning">
                        {item.title}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-warning"></div>
            </div>
          ) : albums.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
              <p className="text-muted">
                {currentFolder ? 'Folder này đang trống' : 'Chưa có folder nào. Hãy tạo folder đầu tiên!'}
              </p>
            </div>
          ) : (
            <div className="row g-3">
              {albums.map(album => (
                <div key={album.uuid || album.id} className="col-6 col-md-4 col-lg-3">
                  <div className="card album-card h-100" onClick={() => onSelect(album)}>
                    {album.cover ? (
                      <img 
                        src={album.cover} 
                        className="album-cover" 
                        alt={album.title}
                      />
                    ) : (
                      <div className="card-body text-center py-4">
                        <i className="fas fa-folder fa-3x text-warning mb-2"></i>
                      </div>
                    )}
                    <div className="card-body">
                      <h6 className="card-title mb-1">{album.title}</h6>
                      <small className="text-muted">
                        {album.subfolderCount > 0 && <span><i className="fas fa-folder me-1"></i>{album.subfolderCount}</span>}
                        {album.subfolderCount > 0 && album.count > 0 && ' • '}
                        {album.count > 0 && <span><i className="fas fa-image me-1"></i>{album.count}</span>}
                        {album.subfolderCount === 0 && album.count === 0 && 'Trống'}
                      </small>
                    </div>
                    <div className="card-footer bg-transparent border-0 pt-0">
                      <button 
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={(e) => { e.stopPropagation(); onEdit(album); }}
                        title="Sửa album"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={(e) => { e.stopPropagation(); onDelete(album); }}
                        title="Xóa album"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Create/Edit Album Modal
    function AlbumModal({ show, album, onClose, onSave, parentId }) {
      const [formData, setFormData] = useState({ slug: '', title: '', description: '', cover_url: '', parent_id: null });
      const [saving, setSaving] = useState(false);
      const [uploadingCover, setUploadingCover] = useState(false);
      const coverInputRef = useRef(null);

      useEffect(() => {
        if (album) {
          setFormData({
            slug: album.id || '',
            title: album.title || '',
            description: album.description || '',
            cover_url: album.cover || '',
            parent_id: album.parentId || null
          });
        } else {
          setFormData({ slug: '', title: '', description: '', cover_url: '', parent_id: parentId || null });
        }
      }, [album, show, parentId]);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSave(formData);
        setSaving(false);
      };

      const generateSlug = (title) => {
        return title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[đĐ]/g, 'd')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      };

      // Nén ảnh bìa (hỗ trợ iPhone HEIC)
      const compressCoverImage = async (file) => {
        const maxSize = 2 * 1024 * 1024; // 2MB
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name);
        
        // Nếu file nhỏ và không phải HEIC, không cần nén
        if (file.size <= maxSize && !isHeic) {
          return file;
        }
        
        try {
          const bitmap = await createImageBitmap(file);
          const canvas = document.createElement('canvas');
          
          // Resize max 800px cho cover
          let width = bitmap.width;
          let height = bitmap.height;
          const maxDimension = 800;
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height / width) * maxDimension);
              width = maxDimension;
            } else {
              width = Math.round((width / height) * maxDimension);
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();
          
          return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
              } else {
                reject(new Error('Không nén được ảnh'));
              }
            }, 'image/jpeg', 0.8);
          });
        } catch (err) {
          console.error('Compress cover error:', err);
          throw new Error('Không thể xử lý ảnh. Thử chọn ảnh khác.');
        }
      };

      // Upload cover image to Cloudinary
      const handleCoverUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type (hỗ trợ Safari iOS - type có thể rỗng)
        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);
        if (!isImage) {
          alert('Vui lòng chọn file ảnh!');
          return;
        }
        
        setUploadingCover(true);
        try {
          // Nén ảnh trước khi upload (convert HEIC -> JPEG)
          const compressedFile = await compressCoverImage(file);

          const data = await window.KTM.cloudinary.uploadImage({
            file: compressedFile,
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            folder: 'ktm-albums/covers',
          });

          if (!data.secure_url) {
            console.error('Cloudinary error:', data);
            throw new Error(data.error?.message || 'Upload failed');
          }

          setFormData(prev => ({ ...prev, cover_url: data.secure_url }));
        } catch (err) {
          console.error('Cover upload error:', err);
          alert('Lỗi upload ảnh bìa: ' + err.message);
        }
        setUploadingCover(false);
        // Reset input để có thể chọn lại cùng file
        e.target.value = '';
      };

      if (!show) return null;

      return (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {album ? 'Sửa' : 'Tạo'} Folder
                </h5>
                <button type="button" className="btn-close" onClick={onClose}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Tên Folder *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.title}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        title: e.target.value,
                        slug: formData.slug || generateSlug(e.target.value)
                      })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Slug (URL) *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                      disabled={!!album}
                    />
                    <small className="text-muted">VD: may-cay-kubota-l1501</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Mô tả</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ảnh bìa</label>
                    <div className="d-flex gap-2 align-items-start">
                      {formData.cover_url && (
                        <div className="position-relative" style={{width: 80, height: 80}}>
                          <img 
                            src={formData.cover_url} 
                            alt="Cover" 
                            style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8}}
                          />
                          <button 
                            type="button"
                            className="btn btn-sm btn-danger position-absolute"
                            style={{top: -8, right: -8, padding: '2px 6px', fontSize: 10}}
                            onClick={() => setFormData(prev => ({ ...prev, cover_url: '' }))}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      )}
                      <div className="flex-grow-1">
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          className="d-none"
                          onChange={handleCoverUpload}
                        />
                        <button 
                          type="button"
                          className="btn btn-outline-secondary w-100 mb-2"
                          onClick={() => coverInputRef.current?.click()}
                          disabled={uploadingCover}
                        >
                          {uploadingCover ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span>Đang upload...</>
                          ) : (
                            <><i className="fas fa-upload me-2"></i>Upload ảnh bìa</>
                          )}
                        </button>
                        <input
                          type="url"
                          className="form-control form-control-sm"
                          value={formData.cover_url}
                          onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                          placeholder="Hoặc dán URL ảnh..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-warning" disabled={saving || uploadingCover}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</> : 'Lưu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // Folder Tree Item Component - Hiển thị dạng cây thư mục
    function FolderTreeItem({ folder, allAlbums, currentAlbumId, targetAlbum, onSelect, level = 0 }) {
      const [expanded, setExpanded] = useState(true);
      const folderId = folder.uuid || folder.id;
      const isCurrentFolder = folderId === currentAlbumId;
      const isSelected = targetAlbum === folderId;
      const children = allAlbums.filter(a => a.parentId === folderId);
      const hasChildren = children.length > 0;

      return (
        <div style={{marginLeft: level * 16 + 'px'}}>
          <div 
            className={`d-flex align-items-center p-2 rounded mb-1 ${isSelected ? 'bg-info text-white' : isCurrentFolder ? 'bg-light text-muted' : 'hover-bg'}`}
            style={{
              cursor: isCurrentFolder ? 'not-allowed' : 'pointer',
              opacity: isCurrentFolder ? 0.5 : 1,
              transition: 'background 0.2s'
            }}
            onClick={() => !isCurrentFolder && onSelect(folderId)}
          >
            {hasChildren && (
              <i 
                className={`fas fa-chevron-${expanded ? 'down' : 'right'} me-2`}
                style={{fontSize: '10px', width: '12px', cursor: 'pointer'}}
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              ></i>
            )}
            {!hasChildren && <span style={{width: '20px'}}></span>}
            <i className={`fas fa-folder${isSelected ? '-open' : ''} me-2 ${isSelected ? '' : 'text-warning'}`}></i>
            <span className="small">{folder.title}</span>
            {isCurrentFolder && <span className="ms-2 badge bg-secondary" style={{fontSize: '9px'}}>Hiện tại</span>}
            {folder.count > 0 && !isCurrentFolder && (
              <span className="ms-auto badge bg-light text-muted" style={{fontSize: '10px'}}>{folder.count}</span>
            )}
          </div>
          
          {expanded && hasChildren && (
            <div>
              {children.map(child => (
                <FolderTreeItem
                  key={child.uuid || child.id}
                  folder={child}
                  allAlbums={allAlbums}
                  currentAlbumId={currentAlbumId}
                  targetAlbum={targetAlbum}
                  onSelect={onSelect}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // Album Detail View (manage images)
    function AlbumDetail({ album, onBack, onRefresh, showToast, onNavigateToFolder, onEditSubfolder, parentAlbum }) {
      const [images, setImages] = useState([]);
      const [subfolders, setSubfolders] = useState([]);
      const [loading, setLoading] = useState(true);
      const [uploading, setUploading] = useState(false);
      const [uploadProgress, setUploadProgress] = useState('');
      const [uploadFiles, setUploadFiles] = useState([]);
      const [uploadPreviews, setUploadPreviews] = useState([]);
      const [captions, setCaptions] = useState({});
      const [previewImage, setPreviewImage] = useState(null);
      const [showCreateFolder, setShowCreateFolder] = useState(false);
      const [newFolderName, setNewFolderName] = useState('');
      const [creatingFolder, setCreatingFolder] = useState(false);
      const fileInputRef = useRef(null);
      const dropZoneRef = useRef(null);
      
      // Move image states
      const [showMoveModal, setShowMoveModal] = useState(false);
      const [selectedImages, setSelectedImages] = useState([]);
      const [allAlbums, setAllAlbums] = useState([]);
      const [targetAlbum, setTargetAlbum] = useState('');
      const [moving, setMoving] = useState(false);

      // Nén ảnh cho iPhone (HEIC, file lớn)
      const compressImage = async (file, maxSizeMB = 2) => {
        const maxSize = maxSizeMB * 1024 * 1024;
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name);
        
        if (file.size <= maxSize && !isHeic) {
          return file;
        }
        
        try {
          const bitmap = await createImageBitmap(file);
          const canvas = document.createElement('canvas');
          
          let width = bitmap.width;
          let height = bitmap.height;
          const maxDimension = 1200;
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height / width) * maxDimension);
              width = maxDimension;
            } else {
              width = Math.round((width / height) * maxDimension);
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();
          
          return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
              } else {
                reject(new Error('Không nén được ảnh'));
              }
            }, 'image/jpeg', 0.7);
          });
        } catch (err) {
          console.error('Compress error:', err);
          throw new Error('Không thể xử lý ảnh');
        }
      };

      useEffect(() => {
        loadData();
        loadAllAlbums();
      }, [album.id, album.uuid]);

      const loadData = async () => {
        setLoading(true);
        try {
          // Load images
          const data = await window.KTM.api.getJSON(
            `${API_BASE}/api/albums/${album.uuid || album.id}`,
            'Lỗi tải dữ liệu'
          );
          setImages(data.images || []);
          
          // Load subfolders
          const subData = await window.KTM.api.getJSON(
            `${API_BASE}/api/albums?parent_id=${album.uuid || album.id}`,
            'Lỗi tải dữ liệu'
          );
          setSubfolders(Array.isArray(subData) ? subData : []);
        } catch (err) {
          console.error(err);
          showToast('Lỗi tải dữ liệu', 'danger');
        }
        setLoading(false);
      };

      // Load all albums for move dropdown
      const loadAllAlbums = async () => {
        try {
          const data = await window.KTM.api.getJSON(`${API_BASE}/api/albums`, 'Lỗi tải album');
          setAllAlbums(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Error loading albums:', err);
        }
      };

      // Toggle chọn/bỏ chọn ảnh
      const toggleSelectImage = (imgId) => {
        setSelectedImages(prev => 
          prev.includes(imgId) 
            ? prev.filter(id => id !== imgId)
            : [...prev, imgId]
        );
      };

      // Move selected images to target album
      const moveImages = async () => {
        if (!targetAlbum || selectedImages.length === 0) {
          showToast('Vui lòng chọn folder đích', 'warning');
          return;
        }

        setMoving(true);
        let successCount = 0;

        for (const imageId of selectedImages) {
          try {
            await window.KTM.api.putJSON(
              `${API_BASE}/api/images/${imageId}`,
              { album_id: targetAlbum },
              'Lỗi di chuyển ảnh'
            );
            successCount++;
          } catch (err) {
            console.error('Move error:', err);
          }
        }

        setMoving(false);
        setShowMoveModal(false);
        setSelectedImages([]);
        setTargetAlbum('');

        if (successCount > 0) {
          showToast(`Đã di chuyển ảnh thành công!`, 'success');
          loadData();
          onRefresh();
        } else {
          showToast('Di chuyển thất bại', 'danger');
        }
      };

      // Bulk delete selected images
      const [deleting, setDeleting] = useState(false);
      
      const bulkDeleteImages = async () => {
        if (selectedImages.length === 0) return;
        
        if (!confirm(`Xóa ${selectedImages.length} ảnh đã chọn? Hành động này không thể hoàn tác!`)) return;
        
        setDeleting(true);
        let successCount = 0;
        
        for (const imageId of selectedImages) {
          try {
            await window.KTM.api.deleteJSON(
              `${API_BASE}/api/images/${imageId}`,
              'Lỗi xóa ảnh'
            );
            successCount++;
          } catch (err) {
            console.error('Delete error:', err);
          }
        }
        
        setDeleting(false);
        setSelectedImages([]);
        
        if (successCount > 0) {
          showToast(`Đã xóa ${successCount} ảnh!`, 'success');
          loadData();
          onRefresh();
        } else {
          showToast('Xóa thất bại', 'danger');
        }
      };
      
      // Select all images
      const selectAllImages = () => {
        if (selectedImages.length === images.length) {
          setSelectedImages([]);
        } else {
          setSelectedImages(images.map(img => img.id));
        }
      };

      const createSubfolder = async () => {
        if (!newFolderName.trim()) return;
        
        setCreatingFolder(true);
        try {
          const slug = newFolderName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
          
          await window.KTM.api.postJSON(
            `${API_BASE}/api/albums`,
            {
              slug: slug + '-' + Date.now(),
              title: newFolderName,
              parent_id: album.uuid || album.id,
            },
            'Lỗi tạo folder'
          );
          
          showToast('Tạo folder thành công!', 'success');
          setNewFolderName('');
          setShowCreateFolder(false);
          loadData();
          onRefresh();
        } catch (err) {
          showToast(err.message, 'danger');
        }
        setCreatingFolder(false);
      };

      const deleteSubfolder = async (folder) => {
        if (!confirm(`Xóa folder "${folder.title}"? Tất cả nội dung bên trong sẽ bị xóa!`)) return;
        
        try {
          await window.KTM.api.deleteJSON(
            `${API_BASE}/api/albums/${folder.uuid || folder.id}`,
            'Lỗi xóa folder'
          );
          showToast('Đã xóa folder', 'success');
          loadData();
          onRefresh();
        } catch (err) {
          showToast('Lỗi xóa folder', 'danger');
        }
      };

      const handleFileSelect = (files) => {
        // Validate cho iOS - check cả name nếu type rỗng
        const newFiles = Array.from(files).filter(f => 
          f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(f.name)
        );
        setUploadFiles(prev => [...prev, ...newFiles]);
        
        // Create previews
        newFiles.forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
            setUploadPreviews(prev => [...prev, { file, preview: e.target.result }]);
          };
          reader.readAsDataURL(file);
        });
      };

      const removeUploadFile = (index) => {
        setUploadFiles(prev => prev.filter((_, i) => i !== index));
        setUploadPreviews(prev => prev.filter((_, i) => i !== index));
      };

      const uploadToCloudinary = async (file) => {
        const data = await window.KTM.cloudinary.uploadImage({
          file,
          cloudName: CLOUDINARY_CLOUD_NAME,
          uploadPreset: CLOUDINARY_UPLOAD_PRESET,
          folder: `ktm-albums/${album.id}`,
        });

        if (!data.secure_url) {
          console.error('Cloudinary error:', data);
          throw new Error(data.error?.message || 'Upload failed');
        }

        return data;
      };

      const handleUpload = async () => {
        if (uploadFiles.length === 0) return;

        setUploading(true);
        let successCount = 0;

        for (let i = 0; i < uploadFiles.length; i++) {
          try {
            setUploadProgress(`Đang xử lý ${i + 1}/${uploadFiles.length}...`);
            
            // Nén ảnh trước khi upload (hỗ trợ iPhone HEIC)
            const compressedFile = await compressImage(uploadFiles[i], 2);
            
            setUploadProgress(`Đang upload ${i + 1}/${uploadFiles.length}...`);
            
            // Upload to Cloudinary
            const cloudinaryRes = await uploadToCloudinary(compressedFile);
            
            // Save to DB
            await window.KTM.api.postJSON(
              `${API_BASE}/api/albums/${album.id}`,
              {
                url: cloudinaryRes.secure_url,
                caption: captions[i] || uploadFiles[i].name.replace(/\.[^/.]+$/, ''),
                sort_order: images.length + i,
              },
              'Lỗi lưu ảnh'
            );
            
            successCount++;
          } catch (err) {
            console.error('Upload error:', err);
          }
        }

        setUploading(false);
        setUploadProgress('');
        setUploadFiles([]);
        setUploadPreviews([]);
        setCaptions({});
        
        if (successCount > 0) {
          showToast(`Đã upload ${successCount} ảnh thành công!`, 'success');
          loadData();
          onRefresh();
        } else {
          showToast('Upload thất bại', 'danger');
        }
      };

      const deleteImage = async (imageId, index) => {
        if (!confirm('Xóa ảnh này?')) return;
        
        try {
          // Note: Cần API delete image - tạm thời chỉ reload
          await window.KTM.api.deleteJSON(`${API_BASE}/api/images/${imageId}`, 'Lỗi xóa ảnh');
          showToast('Đã xóa ảnh', 'success');
          loadData();
          onRefresh();
        } catch (err) {
          showToast('Lỗi xóa ảnh', 'danger');
        }
      };

      // Drag & Drop handlers
      const handleDragOver = (e) => {
        e.preventDefault();
        dropZoneRef.current?.classList.add('dragover');
      };

      const handleDragLeave = () => {
        dropZoneRef.current?.classList.remove('dragover');
      };

      const handleDrop = (e) => {
        e.preventDefault();
        dropZoneRef.current?.classList.remove('dragover');
        handleFileSelect(e.dataTransfer.files);
      };

      return (
        <div>
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="d-flex align-items-center">
              <button className="btn btn-outline-secondary me-3" onClick={onBack}>
                <i className="fas fa-arrow-left"></i>
              </button>
              <div>
                <h4 className="m-0">{album.title}</h4>
                <small className="text-muted">
                  {subfolders.length > 0 && <span>{subfolders.length} folder • </span>}
                  {images.length} ảnh
                </small>
              </div>
            </div>
            <button 
              className="btn btn-outline-warning btn-sm"
              onClick={() => setShowCreateFolder(true)}
            >
              <i className="fas fa-folder-plus me-1"></i>Tạo Folder con
            </button>
          </div>

          {/* Create Subfolder Modal */}
          {showCreateFolder && (
            <div className="card mb-4 border-warning">
              <div className="card-body">
                <h6 className="mb-3"><i className="fas fa-folder-plus me-2 text-warning"></i>Tạo folder con</h6>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tên folder..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createSubfolder()}
                    autoFocus
                  />
                  <button 
                    className="btn btn-warning"
                    onClick={createSubfolder}
                    disabled={creatingFolder || !newFolderName.trim()}
                  >
                    {creatingFolder ? <span className="spinner-border spinner-border-sm"></span> : 'Tạo'}
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subfolders */}
          {subfolders.length > 0 && (
            <div className="card mb-4">
              <div className="card-body">
                <h6 className="mb-3"><i className="fas fa-folder me-2 text-warning"></i>Folder con</h6>
                <div className="row g-2">
                  {subfolders.map(folder => (
                    <div key={folder.uuid || folder.id} className="col-6 col-md-4 col-lg-3">
                      <div 
                        className="card h-100 folder-item" 
                        style={{cursor: 'pointer'}}
                        onClick={() => onNavigateToFolder && onNavigateToFolder(folder)}
                      >
                        <div className="card-body text-center py-3">
                          <i className="fas fa-folder fa-2x text-warning mb-2"></i>
                          <div className="small fw-bold text-truncate">{folder.title}</div>
                          <small className="text-muted">
                            {folder.subfolderCount > 0 && <span>{folder.subfolderCount} folder</span>}
                            {folder.subfolderCount > 0 && folder.count > 0 && ' • '}
                            {folder.count > 0 && <span>{folder.count} ảnh</span>}
                            {folder.subfolderCount === 0 && folder.count === 0 && 'Trống'}
                          </small>
                        </div>
                        <div className="card-footer bg-transparent border-0 pt-0 text-center">
                          <button 
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={(e) => { e.stopPropagation(); onEditSubfolder && onEditSubfolder(folder); }}
                            title="Sửa folder"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={(e) => { e.stopPropagation(); deleteSubfolder(folder); }}
                            title="Xóa folder"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upload Zone */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="mb-3"><i className="fas fa-cloud-upload-alt me-2"></i>Upload ảnh mới</h6>
              
              <div 
                ref={dropZoneRef}
                className="upload-zone"
                onClick={() => fileInputRef.current?.click()}
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

    // ==================== SEARCH CENTER - TRA CỨU NHANH ====================
    
    function SearchCenter({ showToast, onNavigate }) {
      const [searchQuery, setSearchQuery] = useState('');
      const [searchResults, setSearchResults] = useState([]);
      const [allData, setAllData] = useState([]);
      const [categories, setCategories] = useState([]);
      const [selectedCategory, setSelectedCategory] = useState('all');
      const [copiedId, setCopiedId] = useState(null);
      const [viewMode, setViewMode] = useState('list'); // list | grid
      const [loading, setLoading] = useState(true);
      const [albums, setAlbums] = useState([]);
      const [videoFolders, setVideoFolders] = useState([]);
      const searchInputRef = useRef(null);
      
      // AI Search states
      const [aiSearchEnabled, setAiSearchEnabled] = useState(true);
      const [aiSearching, setAiSearching] = useState(false);
      const aiSearchTimeoutRef = useRef(null);
      
      // AI Chat states
      const [showAIChat, setShowAIChat] = useState(false);
      const [aiMessages, setAiMessages] = useState([
        { role: 'assistant', content: 'Xin chào! Hãy hỏi tôi về sản phẩm, giá cả... Ví dụ:\n• "Giá van 2 tay?"\n• "Combo rẻ nhất?"\n• "Freeship?"', attachments: [] }
      ]);
      const [aiInput, setAiInput] = useState('');
      const [aiLoading, setAiLoading] = useState(false);
      const chatEndRef = useRef(null);
      const aiInputRef = useRef(null);
      
      // Modal state for image preview
      const [previewImage, setPreviewImage] = useState(null);
      
      // Quick Edit/Delete states
      const [showQuickEdit, setShowQuickEdit] = useState(false);
      const [editingItem, setEditingItem] = useState(null);
      const [fabOpen, setFabOpen] = useState(false);
      
      // Product Modal states
      const [showProductModal, setShowProductModal] = useState(false);
      const [editingProduct, setEditingProduct] = useState(null);
      
      // Product edit form
      const [productForm, setProductForm] = useState({
        name: '', code: '', price: '', image: '', category: '', note: '', commission_percent: ''
      });
      const productCategories = ['Ty xy lanh', 'Combo Van 1 tay', 'Combo Van 2 tay', 'Combo Van 3 tay', 'Combo Van 4 tay', 'Combo Van 5 tay', 'Trang gạt', 'Phụ kiện', 'Van điều khiển'];
      
      // Quick Edit Product
      const handleQuickEdit = (item) => {
        if (item._type === 'product') {
          setEditingItem(item);
          setProductForm({
            name: item.name || '',
            code: item.code || '',
            price: item.price || '',
            image: item.image || '',
            category: item.category || '',
            note: item.note || '',
            commission_percent: (item.commission_percent ?? item.commissionPercent ?? '')
          });
          setShowQuickEdit(true);
        }
      };
      
      // Save Quick Edit
      const handleSaveQuickEdit = async () => {
        if (!editingItem) return;
        
        try {
          await window.KTM.api.putJSON(
            `${API_BASE}/api/products?id=${editingItem.id}`,
            productForm,
            'Lỗi cập nhật'
          );
          
          showToast('Cập nhật thành công!', 'success');
          setShowQuickEdit(false);
          setEditingItem(null);
          
          // Reload data
          loadAllData();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };
      
      // Quick Delete
      const handleQuickDelete = async (item) => {
        const typeName = item._type === 'product' ? 'sản phẩm' : item._type === 'album' ? 'ảnh' : 'video';
        if (!confirm(`Xóa ${typeName} "${item.name}"?`)) return;
        
        try {
          let url = '';
          if (item._type === 'product') {
            url = `${API_BASE}/api/products?id=${item.id}`;
          } else if (item._type === 'album') {
            url = `${API_BASE}/api/images/${item.id}`;
          } else if (item._type === 'video') {
            url = `${API_BASE}/api/videos/${item.id}`;
          }

          await window.KTM.api.deleteJSON(url, 'Lỗi xóa');
          
          showToast(`Đã xóa ${typeName}`, 'success');
          loadAllData();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };
      
      // Handle save product from FAB modal
      const handleSaveProduct = async (formData) => {
        try {
          const url = editingProduct 
            ? `${API_BASE}/api/products?id=${editingProduct.id}`
            : `${API_BASE}/api/products`;

          if (editingProduct) {
            await window.KTM.api.putJSON(url, formData, 'Lỗi lưu sản phẩm');
          } else {
            await window.KTM.api.postJSON(url, formData, 'Lỗi lưu sản phẩm');
          }

          showToast(editingProduct ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!', 'success');
          setShowProductModal(false);
          setEditingProduct(null);
          loadAllData(); // Refresh search results
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };
      
      // Load data function (song song hóa fetch)

      // Hàm cache helper
      const CACHE_KEY = 'ktm_admin_data_cache_v1';
      const CACHE_TTL = 1000 * 60 * 10; // 10 phút

      const loadAllData = async () => {
        // 1. Thử lấy cache

        let cache = null;
        let usedCache = false;
        const cacheResult = window.KTM.cache.read(CACHE_KEY, { ttlMs: CACHE_TTL, validate: Array.isArray });
        if (cacheResult.hit) {
          cache = cacheResult.value;
          console.log('[CACHE] Using cache, items:', cache.length);
          setAllData(cache);
          setSearchResults(cache);
          setLoading(false); // Dừng loading ngay khi có cache
          usedCache = true;
        } else {
          if (cacheResult.status === 'miss') console.log('[CACHE] No cache found');
          else if (cacheResult.status === 'expired' || cacheResult.status === 'invalid') console.log('[CACHE] Cache expired or invalid');
          else if (cacheResult.status === 'error') console.error('[CACHE] Error parsing cache');
        }

        // Nếu có cache thì không loading, chỉ loading khi fetch mới
        if (!usedCache) setLoading(true);

        // Luôn fetch API để cập nhật cache, nhưng không block UI
        try {
          const safeGetJSON = async (url, fallback) => {
            try {
              const data = await window.KTM.api.getJSON(url, 'Lỗi tải dữ liệu');
              return data ?? fallback;
            } catch (_err) {
              return fallback;
            }
          };

          // Song song hóa 3 API
          const [productsData, albumsList, videosList] = await Promise.all([
            safeGetJSON(`${API_BASE}/api/products?fields=search`, []),
            safeGetJSON(`${API_BASE}/api/albums`, []),
            safeGetJSON(`${API_BASE}/api/video-folders?withVideos=true`, [])
          ]);

          // Products
          const products = Array.isArray(productsData)
            ? productsData.map(p => ({ ...p, _type: 'product', _source: 'database' }))
            : [];

          // Albums & images (song song fetch images từng album)
          setAlbums(albumsList);
          let albumImagesData = [];
          if (Array.isArray(albumsList) && albumsList.length > 0) {
            const albumImageJsonArr = await Promise.all(
              albumsList.map(album => safeGetJSON(`${API_BASE}/api/albums/${album.id}`, {}))
            );
            albumImageJsonArr.forEach((albumDetail, idx) => {
              const album = albumsList[idx];
              if (albumDetail.images && albumDetail.images.length > 0) {
                albumDetail.images.forEach(img => {
                  albumImagesData.push({
                    id: img.id,
                    name: img.caption || 'Ảnh từ ' + album.title,
                    image: img.src,
                    folder: album.title,
                    _type: 'album',
                    _source: 'database'
                  });
                });
              }
            });
          }

          // Videos
          setVideoFolders(videosList);
          let videosData = [];
          if (Array.isArray(videosList)) {
            videosList.forEach(folder => {
              if (folder.videos) {
                folder.videos.forEach(v => {
                  videosData.push({
                    id: v.id,
                    name: v.title,
                    folder: folder.name,
                    image: v.thumb,
                    youtubeId: v.youtubeId,
                    url: v.url,
                    _type: 'video',
                    _source: 'database'
                  });
                });
              }
            });
          }

          const combined = [...products, ...albumImagesData, ...videosData];
          // So sánh với cache, nếu khác thì update UI và cache
          const isDifferent = !cache || JSON.stringify(combined) !== JSON.stringify(cache);
          if (isDifferent) {
            setAllData(combined);
            setSearchResults(combined);
            window.KTM.cache.write(CACHE_KEY, combined);
          }
        } catch (err) {
          console.error('Song song fetch error:', err);
        }
        setLoading(false);
      };

      // Load data từ nhiều nguồn
      useEffect(() => {
        loadAllData();
        
        // Focus search input
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }, []);

      const normalizeText = (value) => {
        try {
          return String(value ?? '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd');
        } catch {
          return String(value ?? '').toLowerCase();
        }
      };

      const parseSearchIntent = (query) => {
        const qn = normalizeText(query).trim();
        const tokens = qn.split(/\s+/).filter(Boolean);

        const includeAlbum = tokens.includes('anh');
        const includeVideo = tokens.includes('video');

        const contentTokens = tokens.filter(t => t !== 'anh' && t !== 'video');
        const cleanedQuery = contentTokens.join(' ');

        const allowedTypes = new Set(['product']);
        if (includeAlbum) allowedTypes.add('album');
        if (includeVideo) allowedTypes.add('video');

        return { allowedTypes, includeAlbum, includeVideo, contentTokens, cleanedQuery };
      };

      const scoreItemMatch = (item, contentTokens, cleanedQuery) => {
        const tokens = Array.isArray(contentTokens) ? contentTokens : [];
        const phrase = normalizeText(cleanedQuery).trim();
        if (!tokens.length && !phrase) return 0;

        const name = normalizeText(item?.name ?? '');
        const code = normalizeText(item?.code ?? '');
        const category = normalizeText(item?.category ?? '');
        const note = normalizeText(item?.note ?? '');
        const folder = normalizeText(item?.folder ?? '');

        const haystackAll = `${name} ${code} ${category} ${note} ${folder}`.trim();
        if (!haystackAll) return 0;

        let score = 0;

        // Phrase-level boosts (best match first)
        if (phrase) {
          if (name === phrase) score += 220;
          if (name.includes(phrase)) score += 140;
          if (name.startsWith(phrase)) score += 160;
          if (code && code === phrase) score += 180;
          if (code && code.includes(phrase)) score += 90;
        }

        // Token-level boosts
        for (const t of tokens) {
          if (!t) continue;
          const reWordStart = new RegExp(`(?:^|\\s)${t.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`);

          if (name.includes(t)) score += 35;
          if (reWordStart.test(name)) score += 25;

          if (code && code.includes(t)) score += 20;
          if (code && reWordStart.test(code)) score += 10;

          if (category && category.includes(t)) score += 12;
          if (folder && folder.includes(t)) score += 12;

          if (note && note.includes(t)) score += 6;
        }

        // Slight preference for shorter names when tied
        if (score > 0 && name) score += Math.max(0, 10 - Math.min(10, Math.floor(name.length / 10)));

        return score;
      };

      const sortByRelevance = (items, contentTokens, cleanedQuery) => {
        const arr = Array.isArray(items) ? items : [];
        if (!arr.length) return [];

        const scored = arr
          .map((it, idx) => ({
            it,
            idx,
            score: scoreItemMatch(it, contentTokens, cleanedQuery),
          }))
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            // stable fallback
            return a.idx - b.idx;
          })
          .map(x => x.it);

        return scored;
      };

      // AI-powered search function
      const performAISearch = async (query, basicResults) => {
        if (!aiSearchEnabled || basicResults.length === 0) return;
        
        setAiSearching(true);
        try {
          // Prepare product list for AI
          const productList = basicResults.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            category: item.category,
            note: item.note,
            folder: item.folder,
            _type: item._type
          }));

          const data = await window.KTM.api.postJSON(
            `${API_BASE}/api/ai-search`,
            { query: query, products: productList },
            'AI Search error'
          );

          if (data && data.matchedIds && data.matchedIds.length > 0) {
            // Filter results to only include AI-matched items
            const { contentTokens, cleanedQuery } = parseSearchIntent(query);
            const matchedSet = new Set(data.matchedIds);
            const aiFiltered = basicResults
              .filter(item => matchedSet.has(item.id))
              .sort((a, b) => scoreItemMatch(b, contentTokens, cleanedQuery) - scoreItemMatch(a, contentTokens, cleanedQuery));
            if (aiFiltered.length > 0) {
              setSearchResults(aiFiltered);
            }
          } else if (data && data.matchedIds && data.matchedIds.length === 0) {
            // AI found no matches - show empty
            setSearchResults([]);
          }
        } catch (err) {
          console.error('AI Search error:', err);
          // Keep basic results on error
        }
        setAiSearching(false);
      };

      // Search function - flexible matching with AI enhancement
      const handleSearch = (query) => {
        setSearchQuery(query);
        
        // Clear previous AI search timeout
        if (aiSearchTimeoutRef.current) {
          clearTimeout(aiSearchTimeoutRef.current);
        }
        
        if (!query.trim()) {
          filterByCategory(selectedCategory);
          return;
        }

        const { allowedTypes, contentTokens, cleanedQuery } = parseSearchIntent(query);

        const results = allData.filter(item => {
          if (!allowedTypes.has(item?._type)) return false;

          if (contentTokens.length === 0) return true;

          // Search through ALL fields
          const searchableText = normalizeText(
            Object.entries(item)
              .filter(([key]) => !key.startsWith('_'))
              .map(([, value]) => String(value || ''))
              .join(' ')
          );

          // OR logic for basic, AI will refine
          return contentTokens.some(word => searchableText.includes(word));
        });

        // Apply category filter
        let finalResults = results;
        if (selectedCategory !== 'all') {
          finalResults = results.filter(item => 
            (item.category || item._type) === selectedCategory
          );
        }
        
        setSearchResults(sortByRelevance(finalResults, contentTokens, cleanedQuery));

        // Trigger AI search after debounce (500ms)
        if (aiSearchEnabled && cleanedQuery.length >= 3) {
          aiSearchTimeoutRef.current = setTimeout(() => {
            performAISearch(cleanedQuery, finalResults);
          }, 500);
        }
      };

      // Filter by category
      const filterByCategory = (cat) => {
        setSelectedCategory(cat);
        
        const { allowedTypes, contentTokens } = parseSearchIntent(searchQuery);
        const { cleanedQuery } = parseSearchIntent(searchQuery);

        let filtered = allData.filter(item => allowedTypes.has(item?._type));
        if (cat !== 'all') {
          filtered = filtered.filter(item => 
            (item.category || item._type) === cat
          );
        }

        if (searchQuery.trim()) {
          if (contentTokens.length > 0) {
            filtered = filtered.filter(item => {
              const searchableText = normalizeText(
                Object.entries(item)
                  .filter(([key]) => !key.startsWith('_'))
                  .map(([, value]) => String(value || ''))
                  .join(' ')
              );
              return contentTokens.every(word => searchableText.includes(word));
            });
          }
        }

        setSearchResults(sortByRelevance(filtered, contentTokens, cleanedQuery));
      };

      // Copy helpers
      const copyText = (text, id) => {
        window.KTM.clipboard.writeText(text).then(() => {
          setCopiedId(id);
          showToast('Đã copy!', 'success');
          setTimeout(() => setCopiedId(null), 1500);
        });
      };

      const copyImage = async (url, id) => {
        try {
          await window.KTM.clipboard.writeImageFromUrl(url);
          setCopiedId(id + '-img');
          showToast('Đã copy ảnh!', 'success');
          setTimeout(() => setCopiedId(null), 1500);
        } catch (err) {
          // Fallback: copy URL
          copyText(url, id + '-img');
        }
      };

      // Find matching items from message - hiện ảnh đúng TẤT CẢ sản phẩm được hỏi
      const findMatchingItems = (message) => {
        let lowerMsg = message.toLowerCase();
        const results = [];
        
        // Chỉ filter products (không lấy albums, videos)
        const products = allData.filter(item => item._type === 'product');
        
        // 1. Tìm xy lanh được đề cập
        if (lowerMsg.includes('ty') || lowerMsg.includes('xy lanh')) {
          if (lowerMsg.includes('giữa') || lowerMsg.includes('giua')) {
            const match = products.find(p => p.name?.toLowerCase().includes('xy lanh giữa'));
            if (match && !results.find(r => r.id === match.id)) results.push(match);
          }
          if (lowerMsg.includes('nghiêng') || lowerMsg.includes('nghieng')) {
            const match = products.find(p => p.name?.toLowerCase().includes('xy lanh nghiêng'));
            if (match && !results.find(r => r.id === match.id)) results.push(match);
          }
          if (lowerMsg.includes('ủi') || lowerMsg.includes('ui')) {
            const match = products.find(p => p.name?.toLowerCase().includes('xy lanh ủi'));
            if (match && !results.find(r => r.id === match.id)) results.push(match);
          }
        }
        
        // 2. Tìm combo "van X tay Y ty"
        const vanTyMatch = lowerMsg.match(/van\s*(\d+)\s*tay.*?(\d+)\s*ty/);
        if (vanTyMatch) {
          const tayNum = vanTyMatch[1];
          const tyNum = vanTyMatch[2];
          // Tìm combo van X tay + Y xylanh
          const comboMatch = products.find(p => {
            const name = p.name?.toLowerCase() || '';
            return name.includes('combo') && 
                   name.includes(`${tayNum} tay`) && 
                   (name.includes(`${tyNum} xy`) || name.includes(`${tyNum} xylanh`));
          });
          if (comboMatch && !results.find(r => r.id === comboMatch.id)) {
            results.push(comboMatch);
          } else {
            // Fallback: combo van X tay bất kỳ
            const fallback = products.find(p => {
              const name = p.name?.toLowerCase() || '';
              return name.includes('combo') && name.includes(`${tayNum} tay`);
            });
            if (fallback && !results.find(r => r.id === fallback.id)) results.push(fallback);
          }
        }
        
        // 3. Tìm combo nếu có từ "combo"
        if (lowerMsg.includes('combo') && !vanTyMatch) {
          const comboTayMatch = lowerMsg.match(/combo.*?(\d+)\s*tay/);
          if (comboTayMatch) {
            const tayNum = comboTayMatch[1];
            const matches = products.filter(p => {
              const name = p.name?.toLowerCase() || '';
              return name.includes('combo') && name.includes(`${tayNum} tay`);
            });
            matches.forEach(m => {
              if (!results.find(r => r.id === m.id)) results.push(m);
            });
          }
        }
        
        // 4. Tìm van đơn lẻ (nếu không có ty đi kèm)
        const vanOnlyMatch = lowerMsg.match(/van\s*(\d+)\s*tay/);
        if (vanOnlyMatch && !lowerMsg.includes('ty') && !lowerMsg.includes('combo')) {
          const vanNum = vanOnlyMatch[1];
          const match = products.find(p => {
            const name = p.name?.toLowerCase() || '';
            return name.includes(`van ${vanNum} tay`) && !name.includes('combo');
          });
          if (match && !results.find(r => r.id === match.id)) results.push(match);
        }
        
        return results.slice(0, 4);
      };

      // AI Chat function - Local AI using data context
      const handleAIChat = async (message) => {
        if (!message.trim()) return;
        
        // Add user message
        const userMsg = { role: 'user', content: message, attachments: [] };
        setAiMessages(prev => [...prev, userMsg]);
        setAiInput('');
        setAiLoading(true);

        // Find matching items to attach
        const matchedItems = findMatchingItems(message);

        // Scroll to bottom
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        try {
          // Chỉ lấy products (không lấy albums, videos)
          const productsOnly = allData.filter(item => item._type === 'product');
          
          // Build context chỉ từ products
          const dataContext = productsOnly.map(item => {
            let info = `- ${item.name}`;
            if (item.code) info += ` (Mã: ${item.code})`;
            if (item.price) info += ` - Giá: ${item.price.replace(/[đ\s]/g, '')}đ`;
            if (item.category) info += ` [${item.category}]`;
            if (item.note) info += ` (${item.note})`;
            return info;
          }).join('\n');

          // Build chat history để AI hiểu ngữ cảnh (lấy 6 tin nhắn gần nhất)
          const recentMessages = aiMessages.slice(-6);
          const historyText = recentMessages.map(m => 
            `${m.role === 'user' ? 'Khách' : 'AI'}: ${m.content}`
          ).join('\n');
          
          // Gộp context = products + history
          const fullContext = historyText 
            ? `LỊCH SỬ HỘI THOẠI:\n${historyText}\n\nDANH SÁCH SẢN PHẨM:\n${dataContext}`
            : dataContext;

          // Call backend API (unified)
          const data = await window.KTM.api.postJSON(
            `${API_BASE}/api/ai-chat`,
            {
              message: message,
              context: fullContext,
              audience: 'admin'
            },
            'API error'
          );
          
          const aiResponse = data.response || 'Xin lỗi, tôi không thể trả lời lúc này.';
          
          // Attach matching items with images/videos
          setAiMessages(prev => [...prev, { 
            role: 'assistant', 
            content: aiResponse,
            attachments: matchedItems
          }]);
        } catch (err) {
          console.error('AI Error:', err);
          
          // Fallback: Simple local search
          const lowerMsg = message.toLowerCase();
          const matches = allData.filter(item => {
            const text = Object.values(item).join(' ').toLowerCase();
            return lowerMsg.split(' ').some(word => text.includes(word));
          });

          let fallbackResponse = '';
          if (matches.length > 0) {
            fallbackResponse = `Tìm thấy ${matches.length} sản phẩm liên quan:\n\n`;
            matches.slice(0, 5).forEach(item => {
              fallbackResponse += `• ${item.name}`;
              if (item.price) fallbackResponse += ` - ${item.price.replace(/[đ\s]/g, '')}đ`;
              if (item.note) fallbackResponse += ` (${item.note})`;
              fallbackResponse += '\n';
            });
            if (matches.length > 5) fallbackResponse += `\n...và ${matches.length - 5} sản phẩm khác`;
          } else {
            fallbackResponse = 'Không tìm thấy sản phẩm phù hợp. Hãy thử từ khóa khác như "van", "combo", "xy lanh"...';
          }
          
          setAiMessages(prev => [...prev, { 
            role: 'assistant', 
            content: fallbackResponse,
            attachments: matches.slice(0, 4)
          }]);
        }

        setAiLoading(false);
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          aiInputRef.current?.focus();
        }, 100);
      };

      // Product Modal for FAB
      function ProductModal({ show, product, categories, onClose, onSave }) {
        const [formData, setFormData] = useState({ name: '', code: '', price: '', image: '', category: '', note: '', sort_order: 0, commission_percent: 5, variants: [], attributes: [] });
        const [saving, setSaving] = useState(false);
        const [uploading, setUploading] = useState(false);
        const imageInputRef = useRef(null);

        // Hàm format tiền VNĐ
        const formatVND = (digits) => window.KTM.money.formatVNDInputDigits(digits);

        const getBasePriceInt = (priceText) => {
          const digits = window.KTM.money.getDigits(String(priceText ?? ''));
          const n = Number(digits);
          return digits && Number.isFinite(n) ? Math.trunc(n) : 0;
        };

        const normalizeVariants = (v, basePriceText) => {
          if (v == null || v === '') return [];
          let next = v;
          if (typeof next === 'string') {
            const s = next.trim();
            if (!s) return [];
            try {
              next = JSON.parse(s);
            } catch {
              return [];
            }
          }
          if (!Array.isArray(next)) return [];
          const base = getBasePriceInt(basePriceText);
          return next
            .map((g) => {
              if (!g || typeof g !== 'object') return null;
              const name = String(g.name ?? '').trim();
              const options = (Array.isArray(g.options) ? g.options : [])
                .map((o) => {
                  if (!o || typeof o !== 'object') return null;
                  const label = String(o.label ?? '').trim();
                  if (!label) return null;
                  const pRaw = o.price ?? o.priceValue ?? o.unit_price ?? o.unitPrice ?? null;
                  const pNum = Number(pRaw);
                  let price = Number.isFinite(pNum) ? Math.trunc(pNum) : null;

                  // Backward compatibility: convert delta -> absolute when possible
                  if (price == null) {
                    const dRaw = o.price_delta ?? o.priceDelta ?? null;
                    const dNum = Number(dRaw);
                    if (Number.isFinite(dNum)) price = base + Math.trunc(dNum);
                  }

                  if (price == null) price = base;
                  const digits = String(Math.max(0, Math.trunc(Number(price) || 0)));
                  return { label, price: Math.max(0, Math.trunc(Number(price) || 0)), priceDigits: digits };
                })
                .filter(Boolean);
              return { name: name || 'Biến thể', options };
            })
            .filter(Boolean);
        };

        const normalizeAttributes = (v) => {
          if (v == null || v === '') return [];
          let next = v;
          if (typeof next === 'string') {
            const s = next.trim();
            if (!s) return [];
            try {
              next = JSON.parse(s);
            } catch {
              return [];
            }
          }

          if (next && typeof next === 'object' && !Array.isArray(next)) {
            next = Object.entries(next).map(([k, val]) => ({ key: k, value: val }));
          }
          if (!Array.isArray(next)) return [];

          return next
            .map((a) => {
              if (!a || typeof a !== 'object') return null;
              const key = String(a.key ?? a.name ?? a.label ?? '').trim();
              const valueStr = String(a.value ?? '').trim();
              const unit = String(a.unit ?? '').trim();
              if (!key) return null;
              return { key, value: valueStr, unit };
            })
            .filter(Boolean);
        };

        useEffect(() => {
          if (product) {
            setFormData({
              name: product.name || '',
              code: product.code || '',
              price: product.price || '',
              image: product.image || '',
              category: product.category || '',
              note: product.note || '',
              sort_order: product.sort_order || 0,
              commission_percent: (product.commission_percent ?? product.commissionPercent ?? 5),
              variants: normalizeVariants(product.variants, product.price),
              attributes: normalizeAttributes(product.attributes)
            });
            // Set price numbers từ product.price
            if (product.price) {
              const numbers = window.KTM.money.getDigits(product.price);
              setPriceNumbers(numbers);
              setFormData(prev => ({...prev, price: formatVND(numbers)}));
            } else {
              setPriceNumbers('');
            }
          } else {
            setFormData({ name: '', code: '', price: '', image: '', category: '', note: '', sort_order: 0, commission_percent: 5, variants: [], attributes: [] });
            setPriceNumbers('');
          }
        }, [product, show]);

        const applyVariantBulkBasePriceToGroup = (groupIndex) => {
          setFormData((prev) => {
            const bulk = getBasePriceInt(prev.price);
            const bulkDigits = String(bulk);
            const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
            const g = { ...(variants[groupIndex] || {}), options: Array.isArray(variants[groupIndex]?.options) ? [...variants[groupIndex].options] : [] };
            g.options = g.options.map((o) => ({ label: String(o?.label || ''), price: bulk, priceDigits: bulkDigits }));
            variants[groupIndex] = g;
            return { ...prev, variants };
          });
        };

        const applyVariantBulkBasePriceAll = () => {
          setFormData((prev) => {
            const bulk = getBasePriceInt(prev.price);
            const bulkDigits = String(bulk);
            const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
            const next = variants.map((g) => {
              const options = (Array.isArray(g?.options) ? g.options : []).map((o) => ({
                label: String(o?.label || ''),
                price: bulk,
                priceDigits: bulkDigits,
              }));
              return { name: String(g?.name || 'Biến thể'), options };
            });
            return { ...prev, variants: next };
          });
        };

        // State để hiển thị tiến trình
        const [uploadStatus, setUploadStatus] = React.useState('');
        
        // Lưu giá trị số thuần để so sánh
        const [priceNumbers, setPriceNumbers] = React.useState('');
        
        // Xử lý khi nhập giá
        const handlePriceChange = (e) => {
          const next = window.KTM.money.nextPriceInputState(e.target.value, priceNumbers);
          setPriceNumbers(next.digits);
          setFormData({ ...formData, price: next.price });
        };

        const compressImage = async (file, maxSizeMB = 2) => {
          const maxSize = maxSizeMB * 1024 * 1024;
          if (file.size <= maxSize) return file;

          try {
            const bitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            
            let width = bitmap.width;
            let height = bitmap.height;
            const maxDimension = 1200;
            
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height / width) * maxDimension);
                width = maxDimension;
              } else {
                width = Math.round((width / height) * maxDimension);
                height = maxDimension;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, width, height);
            bitmap.close();
            
            return new Promise((resolve, reject) => {
              canvas.toBlob((blob) => {
                if (blob) {
                  resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                } else {
                  reject(new Error('Không nén được ảnh'));
                }
              }, 'image/jpeg', 0.8);
            });
          } catch (err) {
            console.error('Compress error:', err);
            throw new Error('Không thể xử lý ảnh. Thử chọn ảnh khác.');
          }
        };

        const handleImageUpload = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
          if (!isImage) {
            alert('Vui lòng chọn file ảnh!');
            return;
          }
          
          setUploading(true);
          try {
            const compressedFile = await compressImage(file);

            const data = await window.KTM.cloudinary.uploadImage({
              file: compressedFile,
              cloudName: CLOUDINARY_CLOUD_NAME,
              uploadPreset: CLOUDINARY_UPLOAD_PRESET,
              folder: 'ktm-products',
            });

            if (!data.secure_url) {
              console.error('Cloudinary error:', data);
              throw new Error(data.error?.message || 'Upload failed');
            }

            setFormData(prev => ({ ...prev, image: data.secure_url }));
          } catch (err) {
            console.error('Upload error:', err);
            alert('Lỗi upload ảnh: ' + err.message);
          }
          setUploading(false);
          e.target.value = '';
        };

        const handleSubmit = async (e) => {
          e.preventDefault();
          setSaving(true);
          const payload = {
            ...formData,
            variants: normalizeVariants(formData.variants, formData.price),
            attributes: normalizeAttributes(formData.attributes),
          };
          await onSave(payload);
          setSaving(false);
        };

        if (!show) return null;

        return (
          <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content" style={{ borderRadius: 16, border: 'none', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <div className="modal-header" style={{ background: 'linear-gradient(135deg, #ffc107, #ff9800)', border: 'none', borderRadius: '16px 16px 0 0' }}>
                  <h5 className="modal-title fw-bold text-dark">
                    <i className="fas fa-box me-2"></i>{product ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
                  </h5>
                  <button type="button" className="btn-close" onClick={onClose}></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <div className="row">
                      <div className="col-md-8">
                        <div className="mb-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-tag me-1"></i>Tên sản phẩm *
                          </label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})} 
                            placeholder="Ví dụ: Xy lanh nghiêng KTM"
                            required
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                          />
                        </div>
                        <div className="row">
                          <div className="col-6">
                            <label className="form-label fw-semibold small text-muted mb-1">
                              <i className="fas fa-hashtag me-1"></i>Mã sản phẩm
                            </label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={formData.code} 
                              onChange={(e) => setFormData({...formData, code: e.target.value})} 
                              placeholder="KTM-01"
                              style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label fw-semibold small text-muted mb-1">
                              <i className="fas fa-dollar-sign me-1"></i>Giá bán
                            </label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={formData.price} 
                              onChange={handlePriceChange} 
                              placeholder="1.950.000đ"
                              style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                            />
                          </div>
                        </div>
                        <div className="mb-3 mt-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-percent me-1"></i>Hoa hồng (%)
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            value={formData.commission_percent}
                            min={0}
                            max={100}
                            step={0.01}
                            placeholder="5"
                            onChange={(e) => setFormData({...formData, commission_percent: e.target.value})}
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-list me-1"></i>Danh mục
                          </label>
                          <select 
                            className="form-select" 
                            value={formData.category} 
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                          >
                            <option value="">Chọn danh mục</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-sticky-note me-1"></i>Ghi chú
                          </label>
                          <textarea 
                            className="form-control" 
                            rows="2" 
                            value={formData.note} 
                            onChange={(e) => setFormData({...formData, note: e.target.value})} 
                            placeholder="Ví dụ: Thêm dây là 2.150.000đ"
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                          />
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-sliders-h me-1"></i>Thuộc tính (cân nặng, chiều dài, ...)
                          </label>
                          <div className="border rounded-3 p-2" style={{ background: '#fff' }}>
                            {(Array.isArray(formData.attributes) ? formData.attributes : []).length === 0 ? (
                              <div className="text-muted small">Chưa có thuộc tính. Ví dụ: Cân nặng, Chiều dài, Vật liệu...</div>
                            ) : null}

                            {(Array.isArray(formData.attributes) ? formData.attributes : []).map((attr, ai) => (
                              <div key={ai} className="row g-2 align-items-center mb-2">
                                <div className="col-5">
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={attr?.key || ''}
                                    onChange={(e) => {
                                      const nextKey = e.target.value;
                                      setFormData((prev) => {
                                        const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                        attributes[ai] = { ...(attributes[ai] || {}), key: nextKey };
                                        return { ...prev, attributes };
                                      });
                                    }}
                                    placeholder="Tên (vd: Cân nặng)"
                                    style={{ borderRadius: 10 }}
                                  />
                                </div>
                                <div className="col-4">
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={attr?.value || ''}
                                    onChange={(e) => {
                                      const nextVal = e.target.value;
                                      setFormData((prev) => {
                                        const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                        attributes[ai] = { ...(attributes[ai] || {}), value: nextVal };
                                        return { ...prev, attributes };
                                      });
                                    }}
                                    placeholder="Giá trị (vd: 10)"
                                    style={{ borderRadius: 10 }}
                                  />
                                </div>
                                <div className="col-2">
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={attr?.unit || ''}
                                    onChange={(e) => {
                                      const nextUnit = e.target.value;
                                      setFormData((prev) => {
                                        const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                        attributes[ai] = { ...(attributes[ai] || {}), unit: nextUnit };
                                        return { ...prev, attributes };
                                      });
                                    }}
                                    placeholder="Đơn vị"
                                    style={{ borderRadius: 10 }}
                                  />
                                </div>
                                <div className="col-1 d-flex justify-content-end">
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => {
                                      setFormData((prev) => {
                                        const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                        attributes.splice(ai, 1);
                                        return { ...prev, attributes };
                                      });
                                    }}
                                    title="Xóa thuộc tính"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              </div>
                            ))}

                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm mt-1"
                              onClick={() => {
                                setFormData((prev) => {
                                  const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                  attributes.push({ key: '', value: '', unit: '' });
                                  return { ...prev, attributes };
                                });
                              }}
                              style={{ borderRadius: 10 }}
                            >
                              <i className="fas fa-plus me-1"></i>Thêm thuộc tính
                            </button>
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-layer-group me-1"></i>Biến thể (size, ...)
                          </label>
                          <div className="border rounded-3 p-2" style={{ background: '#fff' }}>
                            {(Array.isArray(formData.variants) ? formData.variants : []).length === 0 ? (
                              <div className="text-muted small">Chưa có biến thể. Có thể thêm (ví dụ Size: S/M/L).</div>
                            ) : null}

                            {(Array.isArray(formData.variants) ? formData.variants : []).map((group, gi) => (
                              <div key={gi} className="mb-3">
                                <div className="d-flex gap-2 align-items-center mb-2">
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={group?.name || ''}
                                    onChange={(e) => {
                                      const nextName = e.target.value;
                                      setFormData((prev) => {
                                        const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                        variants[gi] = { ...(variants[gi] || {}), name: nextName, options: Array.isArray(variants[gi]?.options) ? variants[gi].options : [] };
                                        return { ...prev, variants };
                                      });
                                    }}
                                    placeholder="Tên nhóm (ví dụ: Size)"
                                    style={{ borderRadius: 10 }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                      onClick={() => applyVariantBulkBasePriceToGroup(gi)}
                                      title="Đặt giá giống giá gốc sản phẩm cho tất cả lựa chọn trong nhóm"
                                      disabled={!Array.isArray(group?.options) || group.options.length === 0}
                                  >
                                    Đồng giá
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => {
                                      setFormData((prev) => {
                                        const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                        variants.splice(gi, 1);
                                        return { ...prev, variants };
                                      });
                                    }}
                                    title="Xóa nhóm"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>

                                <div className="d-grid gap-2">
                                  {(Array.isArray(group?.options) ? group.options : []).map((opt, oi) => (
                                    <div key={oi} className="row g-2 align-items-center">
                                      <div className="col-7">
                                        <input
                                          type="text"
                                          className="form-control"
                                          value={opt?.label || ''}
                                          onChange={(e) => {
                                            const nextLabel = e.target.value;
                                            setFormData((prev) => {
                                              const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                              const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                              const currentPrice = Number(g.options[oi]?.price ?? 0) || 0;
                                              const currentDigits = String(g.options[oi]?.priceDigits ?? Math.max(0, Math.trunc(currentPrice)));
                                              g.options[oi] = { ...(g.options[oi] || {}), label: nextLabel, price: Math.max(0, Math.trunc(currentPrice)), priceDigits: currentDigits };
                                              variants[gi] = g;
                                              return { ...prev, variants };
                                            });
                                          }}
                                          placeholder="Giá trị (ví dụ: M)"
                                          style={{ borderRadius: 10 }}
                                        />
                                      </div>
                                      <div className="col-4">
                                        <input
                                          type="text"
                                          className="form-control"
                                          value={formatVND(String(opt?.priceDigits ?? window.KTM.money.getDigits(String(opt?.price ?? ''))))}
                                          onChange={(e) => {
                                            setFormData((prev) => {
                                              const prevDigits = String(opt?.priceDigits ?? window.KTM.money.getDigits(String(opt?.price ?? '')));
                                              const next = window.KTM.money.nextPriceInputState(e.target.value, prevDigits);
                                              const digits = String(next.digits ?? '');
                                              const n = Number(digits);
                                              const nextPrice = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
                                              const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                              const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                              g.options[oi] = { ...(g.options[oi] || {}), label: String(g.options[oi]?.label || ''), price: nextPrice, priceDigits: digits };
                                              variants[gi] = g;
                                              return { ...prev, variants };
                                            });
                                          }}
                                          placeholder="Giá (đ)"
                                          style={{ borderRadius: 10 }}
                                        />
                                      </div>
                                      <div className="col-1 d-flex justify-content-end">
                                        <button
                                          type="button"
                                          className="btn btn-outline-secondary btn-sm"
                                          onClick={() => {
                                            setFormData((prev) => {
                                              const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                              const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                              g.options.splice(oi, 1);
                                              variants[gi] = g;
                                              return { ...prev, variants };
                                            });
                                          }}
                                          title="Xóa lựa chọn"
                                        >
                                          <i className="fas fa-times"></i>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm mt-2"
                                  onClick={() => {
                                    setFormData((prev) => {
                                      const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                      const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                            const base = getBasePriceInt(prev.price);
                                            g.options.push({ label: '', price: base, priceDigits: String(base) });
                                      variants[gi] = g;
                                      return { ...prev, variants };
                                    });
                                  }}
                                  style={{ borderRadius: 10 }}
                                >
                                  <i className="fas fa-plus me-1"></i>Thêm lựa chọn
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              className="btn btn-outline-warning btn-sm"
                              onClick={() => {
                                setFormData((prev) => {
                                  const base = getBasePriceInt(prev.price);
                                  const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                  const d = String(base);
                                  variants.push({ name: 'Size', options: [{ label: 'S', price: base, priceDigits: d }, { label: 'M', price: base, priceDigits: d }, { label: 'L', price: base, priceDigits: d }] });
                                  return { ...prev, variants };
                                });
                              }}
                              style={{ borderRadius: 10 }}
                            >
                              <i className="fas fa-plus me-1"></i>Thêm nhóm biến thể
                            </button>

                            <div className="d-flex gap-2 align-items-center mt-2">
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={applyVariantBulkBasePriceAll}
                                disabled={!Array.isArray(formData.variants) || formData.variants.length === 0}
                                style={{ borderRadius: 10 }}
                                title="Đặt giá giống giá gốc sản phẩm cho tất cả lựa chọn ở mọi nhóm"
                              >
                                Đồng giá (tất cả)
                              </button>
                            </div>

                            <div className="text-muted small mt-2">Giá biến thể là giá cụ thể (đ). Ví dụ Size S: 15.000đ, Size M: 25.000đ.</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold small text-muted mb-1">
                          <i className="fas fa-image me-1"></i>Ảnh sản phẩm
                        </label>
                        <div className="mb-2">
                          {formData.image ? (
                            <>
                              <img 
                                src={formData.image} 
                                alt="Product" 
                                style={{width: '100%', height: 150, objectFit: 'cover', borderRadius: '12px', border: '2px solid #e9ecef'}}
                              />
                              <button 
                                type="button"
                                className="btn btn-sm btn-danger mt-2"
                                onClick={() => setFormData({...formData, image: ''})}
                                style={{borderRadius: '20px', fontSize: '0.75rem'}}
                              >
                                <i className="fas fa-times me-1"></i>Xóa ảnh
                              </button>
                            </>
                          ) : (
                            <div 
                              className="d-flex align-items-center justify-content-center" 
                              style={{width: '100%', height: 150, borderRadius: '12px', background: 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)', border: '2px dashed #adb5bd', cursor: 'pointer'}}
                              onClick={() => imageInputRef.current?.click()}
                            >
                              <div className="text-center">
                                <i className="fas fa-cloud-upload-alt fa-2x text-muted mb-2"></i>
                                <div className="small text-muted">Click để upload</div>
                              </div>
                            </div>
                          )}
                        </div>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          className="d-none"
                          onChange={handleImageUpload}
                        />
                        <button 
                          type="button"
                          className="btn btn-outline-secondary w-100"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={uploading}
                          style={{borderRadius: '10px'}}
                        >
                          {uploading ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span>Đang upload...</>
                          ) : (
                            <><i className="fas fa-upload me-2"></i>Upload ảnh</>
                          )}
                        </button>
                        <div className="mt-2">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-link me-1"></i>Hoặc URL ảnh
                          </label>
                          <input 
                            type="url" 
                            className="form-control" 
                            value={formData.image} 
                            onChange={(e) => setFormData({...formData, image: e.target.value})} 
                            placeholder="https://..."
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '8px', fontSize: '0.875rem'}}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer" style={{border: 'none', padding: '20px'}}>
                    <button type="button" className="btn btn-light px-4" onClick={onClose} style={{borderRadius: '10px'}}>
                      Hủy
                    </button>
                    <button type="submit" className="btn btn-warning px-4 fw-semibold" disabled={saving} style={{borderRadius: '10px', boxShadow: '0 4px 12px rgba(255,193,7,0.3)'}}>
                      {saving ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</>
                      ) : (
                        <><i className="fas fa-check me-2"></i>Lưu sản phẩm</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      }

      // ========== MOBILE CARD COMPONENT ==========
      const formatVNDNumber = (n) => window.KTM.money.formatVND(n);

      const parseVariantGroupsForDisplay = (value) => {
        if (value == null || value === '') return [];
        let v = value;
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s) return [];
          try {
            v = JSON.parse(s);
          } catch {
            return [];
          }
        }
        return Array.isArray(v) ? v : [];
      };

      const parseAttributesForDisplay = (value) => {
        if (value == null || value === '') return [];
        let v = value;
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s) return [];
          try {
            v = JSON.parse(s);
          } catch {
            return [];
          }
        }
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          v = Object.entries(v).map(([k, val]) => ({ key: k, value: val }));
        }
        return Array.isArray(v) ? v : [];
      };

      const renderAttributesPreview = (attributes, opts = {}) => {
        const rows = parseAttributesForDisplay(attributes)
          .map((a) => ({
            key: String(a?.key ?? a?.name ?? a?.label ?? '').trim(),
            value: String(a?.value ?? '').trim(),
            unit: String(a?.unit ?? '').trim(),
          }))
          .filter((a) => !!a.key);

        if (!rows.length) return null;

        const compact = !!opts.compact;
        const extraClassName = String(opts.className ?? '').trim();

        return (
          <div className={`ktm-variants-preview${compact ? ' compact' : ''}${extraClassName ? ' ' + extraClassName : ''}`}>
            <i className="fas fa-sliders-h"></i>
            <div className="ktm-variants-chips">
              {rows.map((a, idx) => {
                const keyText = a.key;
                const valueText = `${a.value || ''}${a.unit ? (a.value ? ' ' : '') + a.unit : ''}`.trim();
                return (
                  <div key={`${keyText}-${idx}`} className="ktm-variants-group">
                    <span className="ktm-chip ktm-chip-group">{keyText}</span>
                    {valueText ? <span className="ktm-chip ktm-chip-option">{valueText}</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      };

      const renderVariantsPreview = (variants, opts = {}) => {
        const groups = parseVariantGroupsForDisplay(variants)
          .map(g => ({
            name: String(g?.name ?? '').trim(),
            options: Array.isArray(g?.options) ? g.options : [],
          }))
          .map(g => ({
            ...g,
            options: g.options
              .map(o => ({
                label: String(o?.label ?? '').trim(),
                price: Number(o?.price),
              }))
              .filter(o => !!o.label),
          }))
          .filter(g => g.options.length > 0);

        if (!groups.length) return null;

        const maxGroups = Number.isFinite(opts.maxGroups)
          ? Math.max(1, Math.trunc(opts.maxGroups))
          : groups.length;
        const maxOptionsPerGroup = Number.isFinite(opts.maxOptionsPerGroup)
          ? Math.max(1, Math.trunc(opts.maxOptionsPerGroup))
          : 3;
        const compact = !!opts.compact;
        const extraClassName = String(opts.className ?? '').trim();

        const shownGroups = groups.slice(0, maxGroups);

        return (
          <div className={`ktm-variants-preview${compact ? ' compact' : ''}${extraClassName ? ' ' + extraClassName : ''}`}>
            <i className="fas fa-layer-group"></i>
            <div className="ktm-variants-chips">
              {shownGroups.map((g, gi) => {
                const groupName = g.name || 'Biến thể';
                const shownOptions = g.options.slice(0, maxOptionsPerGroup);
                const hiddenOptionsCount = g.options.length - shownOptions.length;

                return (
                  <div key={`${groupName}-${gi}`} className="ktm-variants-group">
                    <span className="ktm-chip ktm-chip-group">{groupName}</span>
                    {shownOptions.map((o, oi) => {
                      const p = o.price;
                      const priceText = Number.isFinite(p) && p >= 0 ? formatVNDNumber(Math.trunc(p)) : '';
                      const text = priceText ? `${o.label} · ${priceText}` : o.label;
                      return (
                        <span key={`${groupName}-${gi}-${oi}`} className="ktm-chip ktm-chip-option">{text}</span>
                      );
                    })}
                    {hiddenOptionsCount > 0 && (
                      <span className="ktm-chip ktm-chip-more">+{hiddenOptionsCount}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      };

      const renderMobileCard = (item, index) => {
        const isProduct = item._type === 'product';
        const isAlbum = item._type === 'album';
        const isVideo = item._type === 'video';
        const hasPromo = item.note && (item.note.toLowerCase().includes('free') || item.note.toLowerCase().includes('giảm') || item.note.toLowerCase().includes('sale'));
        const attributesPreview = isProduct
          ? renderAttributesPreview(item.attributes, {
              compact: viewMode === 'grid',
              className: viewMode === 'grid' ? 'meta text-muted' : 'text-muted',
            })
          : null;
        const variantsPreview = isProduct
          ? renderVariantsPreview(item.variants, {
              compact: viewMode === 'grid',
              // Tra cứu: hiển thị hết option, không hiện dạng +N
              maxOptionsPerGroup: 999,
              className: viewMode === 'grid' ? 'meta text-muted' : 'text-muted',
            })
          : null;

        if (viewMode === 'grid') {
          // Grid view - compact cards
          return (
            <div key={item.id || index} className="grid-card">
              <div className="thumb-wrap" onClick={() => setPreviewImage({ url: item.image, name: item.name, price: item.price, note: item.note, item })}>
                {item.image ? (
                  <img src={item.image} alt={item.name} className="thumb" loading="lazy" />
                ) : (
                  <div className="thumb d-flex align-items-center justify-content-center bg-light">
                    <i className={`fas ${isVideo ? 'fa-video' : 'fa-image'} fa-2x text-muted`}></i>
                  </div>
                )}
                {/* Price overlay */}
                {item.price && (
                  <div className="price-overlay">{item.price.replace(/[đ\s]/g, '')}đ</div>
                )}
                {/* Type badge */}
                <span className={`type-badge ${isProduct ? 'product' : isAlbum ? 'album' : 'video'}`}>
                  {isProduct ? 'SP' : isAlbum ? 'Ảnh' : 'Video'}
                </span>
                {/* Promo badge */}
                {hasPromo && <span className="promo-badge">🔥 ƯU ĐÃI</span>}
              </div>
              <div className="card-body">
                <div className="name">{item.name}</div>
                {item.note && <div className="meta text-info" style={{fontSize: 10}}>{item.note}</div>}
                {attributesPreview && <div style={{ marginTop: 2 }}>{attributesPreview}</div>}
                {variantsPreview && <div style={{ marginTop: 2 }}>{variantsPreview}</div>}
                <div className="quick-copy">
                  <button 
                    className={copiedId === item.id + '-img' ? 'copied' : ''}
                    onClick={() => copyImage(item.image, item.id)}
                  >
                    <i className="fas fa-image"></i>
                  </button>
                  {item.price && (
                    <button 
                      className={copiedId === item.id + '-price' ? 'copied' : ''}
                      onClick={() => copyText(item.price.replace(/[đ\s]/g, ''), item.id + '-price')}
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
                  onClick={() => setPreviewImage({ url: item.image, name: item.name, price: item.price, note: item.note, item })}
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
                  onClick={() => onNavigate && onNavigate('orders', 'create', { productId: item.id })}
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
                  onClick={() => copyText(item.price.replace(/[đ\s]/g, ''), item.id + '-price')}
                >
                  <i className="fas fa-tag"></i> Giá
                </button>
              )}
              <button 
                className={copiedId === item.id + '-name' ? 'copied' : ''}
                onClick={() => copyText(item.name, item.id + '-name')}
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

      return (
        <>
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
                placeholder="🔍 Tìm: van 3 tay, xylanh..."
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
        setEditingFolder(folder);
        setShowFolderModal(true);
      };

      const handleSaveFolder = async (formData) => {
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
          setShowFolderModal(false);
          loadFolders(currentParentFolder?.id);
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

      // Video handlers
      const handleCreateVideo = () => {
        setEditingVideo(null);
        setShowVideoModal(true);
      };

      const handleEditVideo = (video) => {
        setEditingVideo(video);
        setShowVideoModal(true);
      };

      const handleSaveVideo = async (formData) => {
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
          setShowVideoModal(false);
          loadFolders();
          if (selectedFolder) {
            loadVideosInFolder(selectedFolder.id);
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
        </div>
      );
    }

    // Video Folder Modal
    function VideoFolderModal({ show, folder, onClose, onSave }) {
      const [formData, setFormData] = useState({ name: '', description: '', sortOrder: 0, coverImage: '' });
      const [saving, setSaving] = useState(false);
      const [uploading, setUploading] = useState(false);

      useEffect(() => {
        if (folder) {
          setFormData({
            name: folder.name || '',
            description: folder.description || '',
            sortOrder: folder.sortOrder || 0,
            coverImage: folder.coverImage || ''
          });
        } else {
          setFormData({ name: '', description: '', sortOrder: 0, coverImage: '' });
        }
      }, [folder, show]);

      const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);

        try {
          const data = await window.KTM.cloudinary.uploadImage({
            file,
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
          });
          if (data.secure_url) {
            setFormData(prev => ({ ...prev, coverImage: data.secure_url }));
          }
          // Xóa cache khi cập nhật
          window.KTM.cache.remove(CACHE_KEY);
          showToast('Cập nhật thành công!', 'success');
          setShowQuickEdit(false);
          setEditingItem(null);
          // Reload data
          loadAllData();
        } catch (err) {
          console.error('Cloudinary upload error:', err);
          alert('Lỗi upload ảnh: ' + (err.message || err));
        } finally {
          setUploading(false);
        }
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
          ...formData,
          variants: normalizeVariants(formData.variants, formData.price),
          attributes: normalizeAttributes(formData.attributes),
        };
        await onSave(payload);
        setSaving(false);
      };

      if (!show) return null;

      return (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{folder ? 'Sửa Folder' : 'Tạo Folder mới'}</h5>
                <button type="button" className="btn-close" onClick={onClose}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Tên folder *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Mô tả</label>
                    <textarea
                      className="form-control"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="2"
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Thứ tự</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ảnh bìa</label>
                    <div className="d-flex align-items-start gap-3">
                      {formData.coverImage ? (
                        <div className="position-relative">
                          <img 
                            src={formData.coverImage} 
                            alt="Cover" 
                            className="rounded"
                            style={{ width: 120, height: 80, objectFit: 'cover' }}
                          />
                          <button 
                            type="button"
                            className="btn btn-sm btn-danger position-absolute top-0 end-0"
                            onClick={() => setFormData({ ...formData, coverImage: '' })}
                            style={{ transform: 'translate(30%, -30%)' }}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="bg-light rounded d-flex align-items-center justify-content-center text-muted"
                          style={{ width: 120, height: 80 }}
                        >
                          <i className="fas fa-image fa-2x"></i>
                        </div>
                      )}
                      <div className="flex-grow-1">
                        <input
                          type="file"
                          className="form-control form-control-sm"
                          accept="image/*,image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleImageUpload}
                          disabled={uploading}
                        />
                        {uploading && (
                          <div className="mt-1 text-muted small">
                            <span className="spinner-border spinner-border-sm me-1"></span>
                            Đang upload...
                          </div>
                        )}
                        <div className="mt-1 text-muted small">Hoặc dán URL:</div>
                        <input
                          type="url"
                          className="form-control form-control-sm"
                          placeholder="https://..."
                          value={formData.coverImage}
                          onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-warning" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</> : 'Lưu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // ==================== PRODUCT MANAGER ====================
    function ProductManager({ showToast, settings }) {
      const [products, setProducts] = useState([]);
      const [loading, setLoading] = useState(true);
      const [showModal, setShowModal] = useState(false);
      const [editingProduct, setEditingProduct] = useState(null);
      const [searchTerm, setSearchTerm] = useState('');
      const [filterCategory, setFilterCategory] = useState('');

      // Ops inspector drawer
      const [inspectorOpen, setInspectorOpen] = useState(false);
      const [inspectorProduct, setInspectorProduct] = useState(null);

      const shipPercent = normalizeShipPercent(settings?.ship_percent);

      const { parseMoney, formatVND } = window.KTM.money;

      const categories = ['Ty xy lanh', 'Combo Van 1 tay', 'Combo Van 2 tay', 'Combo Van 3 tay', 'Combo Van 4 tay', 'Combo Van 5 tay', 'Trang gạt', 'Phụ kiện', 'Van điều khiển'];

      useEffect(() => { loadProducts(); }, []);

      const loadProducts = async () => {
        setLoading(true);
        try {
          const data = await window.KTM.api.getJSON(`${API_BASE}/api/products`, 'Lỗi tải sản phẩm');
          setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error(err);
          showToast('Lỗi tải sản phẩm', 'danger');
        }
        setLoading(false);
      };

      const handleCreate = () => { setEditingProduct(null); setShowModal(true); };

      const handleEdit = (product) => { setEditingProduct(product); setShowModal(true); };

      const openProductInspector = (product) => {
        if (!product) return;
        setInspectorProduct(product);
        setInspectorOpen(true);
      };

      const closeProductInspector = () => {
        setInspectorOpen(false);
      };
      
      // Hàm xóa ảnh trên Cloudinary (dùng chung)
      const deleteCloudinaryImageGlobal = async (imageUrl) => {
        if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;

        try {
          await window.KTM.api.postJSON(
            `${API_BASE}/api/products?action=delete-image`,
            { url: imageUrl },
            'Lỗi xóa ảnh'
          );
          // Xóa cache khi xóa
          window.KTM.cache.remove(CACHE_KEY);
          showToast(`Đã xóa ${typeName}`, 'success');
          loadAllData();
          loadProducts();
        } catch (err) {
          showToast('Lỗi xóa sản phẩm', 'danger');
        }
      };

      const handleSave = async (formData) => {
        try {
          const url = editingProduct 
            ? `${API_BASE}/api/products?id=${editingProduct.id}`
            : `${API_BASE}/api/products`;
          if (editingProduct) {
            await window.KTM.api.putJSON(url, formData, 'Lỗi lưu sản phẩm');
          } else {
            await window.KTM.api.postJSON(url, formData, 'Lỗi lưu sản phẩm');
          }
          showToast(editingProduct ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!', 'success');
          setShowModal(false);
          loadProducts();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };

      const handleDelete = async (product) => {
        if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}"?`)) return;
        
        try {
          await window.KTM.api.deleteJSON(
            `${API_BASE}/api/products?id=${product.id}`,
            'Lỗi xóa sản phẩm'
          );
          
          showToast('Xóa sản phẩm thành công!', 'success');
          loadProducts();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };

      const filteredProducts = products.filter(p => {
        const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchCategory = !filterCategory || p.category === filterCategory;
        return matchSearch && matchCategory;
      });

      const getCommissionPercentNumber = (product) => {
        const raw = product?.commission_percent ?? product?.commissionPercent;
        const parsed = raw === '' || raw == null ? NaN : Number(raw);
        return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 5;
      };

      const formatCommissionWithAmount = (product) => {
        const pct = getCommissionPercentNumber(product);
        const prettyPct = Number.isInteger(pct) ? String(pct) : String(Math.round(pct * 100) / 100);

        const price = parseMoney(product?.price);
        if (!Number.isFinite(price) || price <= 0) return `${prettyPct}%`;

        const rate = (Number(pct) || 0) / 100;
        const explicitShipFee = window.KTM.money.parseShipFeeFromNote(product?.note);
        // Nếu sản phẩm đã ghi rõ ship trong note => hoa hồng tính trên nguyên giá (không trừ ship).
        // Nếu không có ship trong note => trừ ship ước tính theo % cài đặt.
        const shipCost = explicitShipFee != null
          ? 0
          : (shipPercent > 0 ? (price * shipPercent / 100) : 0);
        const commission = (price * rate) - (shipCost * rate);
        const commissionRounded = Math.max(0, Math.round(commission));

        return `${prettyPct}% - ${formatVND(commissionRounded)}`;
      };

      const parseVariantGroupsForDisplay = (value) => {
        if (value == null || value === '') return [];
        let v = value;
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s) return [];
          try {
            v = JSON.parse(s);
          } catch {
            return [];
          }
        }
        return Array.isArray(v) ? v : [];
      };

      const parseAttributesForDisplay = (value) => {
        if (value == null || value === '') return [];
        let v = value;
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s) return [];
          try {
            v = JSON.parse(s);
          } catch {
            return [];
          }
        }
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          v = Object.entries(v).map(([k, val]) => ({ key: k, value: val }));
        }
        return Array.isArray(v) ? v : [];
      };

      const renderAttributesPreview = (attributes) => {
        const rows = parseAttributesForDisplay(attributes)
          .map((a) => ({
            key: String(a?.key ?? a?.name ?? a?.label ?? '').trim(),
            value: String(a?.value ?? '').trim(),
            unit: String(a?.unit ?? '').trim(),
          }))
          .filter((a) => !!a.key);

        if (!rows.length) return null;

        return (
          <div className="ktm-variants-preview">
            <i className="fas fa-sliders-h"></i>
            <div className="ktm-variants-chips">
              {rows.map((a, idx) => {
                const keyText = a.key;
                const valueText = `${a.value || ''}${a.unit ? (a.value ? ' ' : '') + a.unit : ''}`.trim();
                return (
                  <div key={`${keyText}-${idx}`} className="ktm-variants-group">
                    <span className="ktm-chip ktm-chip-group">{keyText}</span>
                    {valueText ? <span className="ktm-chip ktm-chip-option">{valueText}</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      };

      const renderVariantsPreview = (variants, opts = {}) => {
        const groups = parseVariantGroupsForDisplay(variants)
          .map(g => ({
            name: String(g?.name ?? '').trim(),
            options: Array.isArray(g?.options) ? g.options : [],
          }))
          .map(g => ({
            ...g,
            options: g.options
              .map(o => ({
                label: String(o?.label ?? '').trim(),
                price: Number(o?.price),
              }))
              .filter(o => !!o.label),
          }))
          .filter(g => g.options.length > 0);

        if (!groups.length) return null;

        const maxGroups = Number.isFinite(opts.maxGroups)
          ? Math.max(1, Math.trunc(opts.maxGroups))
          : groups.length;
        const maxOptionsPerGroup = Number.isFinite(opts.maxOptionsPerGroup)
          ? Math.max(1, Math.trunc(opts.maxOptionsPerGroup))
          : 4;

        const shownGroups = groups.slice(0, maxGroups);

        return (
          <div className="ktm-variants-preview">
            <i className="fas fa-layer-group"></i>
            <div className="ktm-variants-chips">
              {shownGroups.map((g, gi) => {
                const groupName = g.name || 'Biến thể';
                const shownOptions = g.options.slice(0, maxOptionsPerGroup);
                const hiddenOptionsCount = g.options.length - shownOptions.length;

                return (
                  <div key={`${groupName}-${gi}`} className="ktm-variants-group">
                    <span className="ktm-chip ktm-chip-group">{groupName}</span>
                    {shownOptions.map((o, oi) => {
                      const p = o.price;
                      const priceText = Number.isFinite(p) && p >= 0 ? formatVND(Math.trunc(p)) : '';
                      const text = priceText ? `${o.label} · ${priceText}` : o.label;
                      return (
                        <span key={`${groupName}-${gi}-${oi}`} className="ktm-chip ktm-chip-option">{text}</span>
                      );
                    })}
                    {hiddenOptionsCount > 0 && (
                      <span className="ktm-chip ktm-chip-more">+{hiddenOptionsCount}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      };

      return (
        <div className="product-manager pb-5 mb-4">
          {/* Header */}
          <div className="product-header">
            <h5><i className="fas fa-box me-2"></i>Sản phẩm</h5>
            <button className="btn-add-product" onClick={handleCreate}>
              <i className="fas fa-plus me-1"></i>Thêm mới
            </button>
          </div>

          {/* Search & Filter */}
          <div className="product-search">
            <div className="d-flex gap-2 mb-2">
              <div className="flex-grow-1 position-relative">
                <input
                  type="text"
                  className="form-control"
                  placeholder="🔍 Tìm sản phẩm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <span className="product-count">{filteredProducts.length}</span>
            </div>
            <select className="form-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">📁 Tất cả danh mục</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Product List */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-warning" style={{width: '2.5rem', height: '2.5rem'}}></div>
              <p className="text-muted mt-3 mb-0">Đang tải...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-box-open"></i>
              <p>Chưa có sản phẩm nào</p>
              <button className="btn btn-warning" onClick={handleCreate}>
                <i className="fas fa-plus me-2"></i>Thêm sản phẩm đầu tiên
              </button>
            </div>
          ) : (
            <div className="product-list">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="product-item d-flex align-items-center gap-3"
                  role="button"
                  tabIndex={0}
                  onClick={() => openProductInspector(product)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openProductInspector(product);
                    }
                  }}
                  title="Xem chi tiết"
                >
                  {/* Image */}
                  {product.image ? (
                    <img src={product.image} alt="" className="product-img" />
                  ) : (
                    <div className="product-img-placeholder">
                      <i className="fas fa-image text-muted"></i>
                    </div>
                  )}
                  
                  {/* Info */}
                  <div className="flex-grow-1 min-width-0">
                    <div className="product-name">{product.name}</div>
                    <div className="d-flex flex-wrap gap-1 mb-1">
                      {product.category && (
                        <span className="product-badge bg-info bg-opacity-75">{product.category}</span>
                      )}
                      {product.code && (
                        <span className="product-badge bg-secondary">{product.code}</span>
                      )}
                      <span
                        className="product-badge bg-warning text-dark"
                        title="Hoa hồng (%)"
                      >
                        <i className="fas fa-percent me-1"></i>{formatCommissionWithAmount(product)}
                      </span>
                    </div>
                    <div className="product-price">{product.price ? product.price.replace(/[đ\s]/g, '') + 'đ' : 'Liên hệ'}</div>
                    {product.note && (
                      <div className="text-muted small mt-1" style={{fontSize: '0.75rem'}}>{product.note}</div>
                    )}
                    {renderAttributesPreview(product.attributes) && (
                      <div className="mt-1" style={{fontSize: '0.75rem'}}>
                        {renderAttributesPreview(product.attributes)}
                      </div>
                    )}
                    {renderVariantsPreview(product.variants, { maxOptionsPerGroup: 4 }) && (
                      <div className="mt-1" style={{fontSize: '0.75rem'}}>
                        {renderVariantsPreview(product.variants, { maxOptionsPerGroup: 4 })}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="product-actions">
                    <button className="btn btn-edit" onClick={(e) => { e.stopPropagation(); handleEdit(product); }} title="Sửa">
                      <i className="fas fa-pen"></i>
                    </button>
                    <button className="btn btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(product); }} title="Xóa">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <AdminDrawer
            open={inspectorOpen}
            title={String(inspectorProduct?.name || 'Sản phẩm')}
            subtitle={[String(inspectorProduct?.code || '').trim() || null, String(inspectorProduct?.category || '').trim() || null].filter(Boolean).join(' • ')}
            onClose={closeProductInspector}
            footer={(
              <div className="d-flex flex-wrap gap-2 justify-content-between">
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      const code = String(inspectorProduct?.code || '').trim();
                      if (!code) return;
                      window.KTM.clipboard.writeText(code).then(() => showToast('Đã copy mã sản phẩm', 'success'));
                    }}
                    disabled={!String(inspectorProduct?.code || '').trim()}
                    title="Copy mã"
                  >
                    <i className="fas fa-barcode me-2"></i>Copy mã
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      const price = String(inspectorProduct?.price || '').trim();
                      if (!price) return;
                      window.KTM.clipboard.writeText(price).then(() => showToast('Đã copy giá', 'success'));
                    }}
                    disabled={!String(inspectorProduct?.price || '').trim()}
                    title="Copy giá"
                  >
                    <i className="fas fa-copy me-2"></i>Copy giá
                  </button>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => inspectorProduct && handleEdit(inspectorProduct)}
                    disabled={!inspectorProduct}
                  >
                    <i className="fas fa-pen me-2"></i>Sửa
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => inspectorProduct && handleDelete(inspectorProduct)}
                    disabled={!inspectorProduct}
                  >
                    <i className="fas fa-trash me-2"></i>Xóa
                  </button>
                </div>
              </div>
            )}
          >
            {!inspectorProduct ? (
              <div className="text-muted">Chưa có dữ liệu</div>
            ) : (
              <>
                <div className="admin-drawer-section">
                  <h6><i className="fas fa-circle-info me-2 text-warning"></i>Tổng quan</h6>
                  <div className="admin-kv">
                    <div className="k">Giá</div>
                    <div className="v">{(() => {
                      const raw = String(inspectorProduct?.price || '').trim();
                      const n = parseMoney(raw);
                      if (Number.isFinite(n) && n > 0) return formatVND(Math.trunc(n));
                      return raw || 'Liên hệ';
                    })()}</div>
                    <div className="k">Hoa hồng</div>
                    <div className="v">{formatCommissionWithAmount(inspectorProduct)}</div>
                    <div className="k">Danh mục</div>
                    <div className="v">{inspectorProduct.category || '—'}</div>
                    <div className="k">Mã</div>
                    <div className="v"><span className="font-monospace">{inspectorProduct.code || '—'}</span></div>
                  </div>
                </div>

                <div className="admin-drawer-section">
                  <h6><i className="fas fa-image me-2 text-info"></i>Hình ảnh</h6>
                  {inspectorProduct.image ? (
                    <img
                      src={inspectorProduct.image}
                      alt=""
                      className="rounded"
                      style={{ width: '100%', maxHeight: 260, objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="text-muted">Chưa có ảnh</div>
                  )}
                </div>

                {(String(inspectorProduct.note || '').trim() || inspectorProduct.attributes || inspectorProduct.variants) && (
                  <div className="admin-drawer-section">
                    <h6><i className="fas fa-sliders-h me-2 text-primary"></i>Chi tiết</h6>
                    {(String(inspectorProduct.note || '').trim()) && (
                      <div className="text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        <span className="fw-semibold">Ghi chú:</span> {String(inspectorProduct.note || '').trim()}
                      </div>
                    )}
                    {renderAttributesPreview(inspectorProduct.attributes) ? (
                      <div className="mt-2">{renderAttributesPreview(inspectorProduct.attributes)}</div>
                    ) : null}
                    {renderVariantsPreview(inspectorProduct.variants, { maxGroups: 99, maxOptionsPerGroup: 8 }) ? (
                      <div className="mt-2">{renderVariantsPreview(inspectorProduct.variants, { maxGroups: 99, maxOptionsPerGroup: 8 })}</div>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </AdminDrawer>

          <ProductModal
            show={showModal}
            product={editingProduct}
            categories={categories}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        </div>
      );
    }

    // Product Modal (Create/Edit) - Light Theme
    function ProductModal({ show, product, categories, onClose, onSave }) {
      const [formData, setFormData] = useState({ name: '', code: '', price: '', image: '', category: '', note: '', sort_order: 0, commission_percent: 5, variants: [], attributes: [] });
      const [saving, setSaving] = useState(false);
      const [uploading, setUploading] = useState(false);

      const getBasePriceInt = (priceText) => {
        const digits = window.KTM.money.getDigits(String(priceText ?? ''));
        const n = Number(digits);
        return digits && Number.isFinite(n) ? Math.trunc(n) : 0;
      };

      const normalizeAttributes = (v) => {
        if (v == null || v === '') return [];
        let next = v;
        if (typeof next === 'string') {
          const s = next.trim();
          if (!s) return [];
          try {
            next = JSON.parse(s);
          } catch {
            return [];
          }
        }

        if (next && typeof next === 'object' && !Array.isArray(next)) {
          next = Object.entries(next).map(([k, val]) => ({ key: k, value: val }));
        }
        if (!Array.isArray(next)) return [];

        return next
          .map((a) => {
            if (!a || typeof a !== 'object') return null;
            const key = String(a.key ?? a.name ?? a.label ?? '').trim();
            const valueStr = String(a.value ?? '').trim();
            const unit = String(a.unit ?? '').trim();
            if (!key) return null;
            return { key, value: valueStr, unit };
          })
          .filter(Boolean);
      };

      const normalizeVariants = (v, basePriceText) => {
        if (v == null || v === '') return [];
        let next = v;
        if (typeof next === 'string') {
          const s = next.trim();
          if (!s) return [];
          try {
            next = JSON.parse(s);
          } catch {
            return [];
          }
        }
        if (!Array.isArray(next)) return [];
        const base = getBasePriceInt(basePriceText);
        return next
          .map((g) => {
            if (!g || typeof g !== 'object') return null;
            const name = String(g.name ?? '').trim();
            const options = (Array.isArray(g.options) ? g.options : [])
              .map((o) => {
                if (!o || typeof o !== 'object') return null;
                const label = String(o.label ?? '').trim();
                if (!label) return null;
                const pRaw = o.price ?? o.priceValue ?? o.unit_price ?? o.unitPrice ?? null;
                const pNum = Number(pRaw);
                let price = Number.isFinite(pNum) ? Math.trunc(pNum) : null;

                if (price == null) {
                  const dRaw = o.price_delta ?? o.priceDelta ?? null;
                  const dNum = Number(dRaw);
                  if (Number.isFinite(dNum)) price = base + Math.trunc(dNum);
                }

                if (price == null) price = base;
                const digits = String(Math.max(0, Math.trunc(Number(price) || 0)));
                return { label, price: Math.max(0, Math.trunc(Number(price) || 0)), priceDigits: digits };
              })
              .filter(Boolean);
            return { name: name || 'Biến thể', options };
          })
          .filter(Boolean);
      };

      useEffect(() => {
        if (product) {
          setFormData({
            name: product.name || '',
            code: product.code || '',
            price: product.price || '',
            image: product.image || '',
            category: product.category || '',
            note: product.note || '',
            sort_order: product.sort_order || 0,
            commission_percent: (product.commission_percent ?? product.commissionPercent ?? 5),
            variants: normalizeVariants(product.variants, product.price),
            attributes: normalizeAttributes(product.attributes)
          });
        } else {
          setFormData({ name: '', code: '', price: '', image: '', category: '', note: '', sort_order: 0, commission_percent: 5, variants: [], attributes: [] });
        }
      }, [product, show]);

      const applyVariantBulkBasePriceToGroup = (groupIndex) => {
        setFormData((prev) => {
          const bulk = getBasePriceInt(prev.price);
          const bulkDigits = String(bulk);
          const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
          const g = { ...(variants[groupIndex] || {}), options: Array.isArray(variants[groupIndex]?.options) ? [...variants[groupIndex].options] : [] };
          g.options = g.options.map((o) => ({ label: String(o?.label || ''), price: bulk, priceDigits: bulkDigits }));
          variants[groupIndex] = g;
          return { ...prev, variants };
        });
      };

      const applyVariantBulkBasePriceAll = () => {
        setFormData((prev) => {
          const bulk = getBasePriceInt(prev.price);
          const bulkDigits = String(bulk);
          const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
          const next = variants.map((g) => {
            const options = (Array.isArray(g?.options) ? g.options : []).map((o) => ({
              label: String(o?.label || ''),
              price: bulk,
              priceDigits: bulkDigits,
            }));
            return { name: String(g?.name || 'Biến thể'), options };
          });
          return { ...prev, variants: next };
        });
      };

      // State để hiển thị tiến trình
      const [uploadStatus, setUploadStatus] = React.useState('');
      
      // Hàm format tiền VNĐ
      const formatVND = (digits) => window.KTM.money.formatVNDInputDigits(digits);
      
      // Lưu giá trị số thuần để so sánh
      const [priceNumbers, setPriceNumbers] = React.useState('');
      
      // Xử lý khi nhập giá
      const handlePriceChange = (e) => {
        const next = window.KTM.money.nextPriceInputState(e.target.value, priceNumbers);
        setPriceNumbers(next.digits);
        setFormData({ ...formData, price: next.price });
      };
      
      // Lưu ảnh cũ để xóa khi thay ảnh mới
      const [oldImage, setOldImage] = React.useState('');
      
      React.useEffect(() => {
        if (product?.image) {
          setOldImage(product.image);
        }
      }, [product]);

      // Hàm xóa ảnh trên Cloudinary
      const deleteCloudinaryImage = async (imageUrl) => {
        if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
        try {
          await window.KTM.api.postJSON(
            `${API_BASE}/api/products?action=delete-image`,
            { url: imageUrl },
            'Lỗi xóa ảnh'
          );
        } catch (err) {
          console.error('Delete cloudinary image error:', err);
        }
      };

      // Nén ảnh trước khi upload (cho file lớn từ iPhone)
      const compressImage = async (file, maxSizeMB = 2, onProgress) => {
        const maxSize = maxSizeMB * 1024 * 1024;
        
        // Nếu file đã nhỏ và không phải HEIC, không cần nén
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name);
        if (file.size <= maxSize && !isHeic) {
          return file;
        }
        
        onProgress?.('Đang xử lý ảnh...');
        
        try {
          // Dùng createImageBitmap - hỗ trợ HEIC trên Safari iOS
          const bitmap = await createImageBitmap(file);
          
          onProgress?.('Đang nén ảnh...');
          
          const canvas = document.createElement('canvas');
          
          // Resize (max 1200px)
          let width = bitmap.width;
          let height = bitmap.height;
          const maxDimension = 1200;
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height / width) * maxDimension);
              width = maxDimension;
            } else {
              width = Math.round((width / height) * maxDimension);
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close(); // Giải phóng memory
          
          // Convert to blob
          return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) {
                onProgress?.('Hoàn tất!');
                resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
              } else {
                reject(new Error('Không nén được ảnh'));
              }
            }, 'image/jpeg', 0.7);
          });
        } catch (err) {
          console.error('createImageBitmap error:', err);
          throw new Error('Không thể xử lý ảnh. Thử chọn ảnh khác.');
        }
      };

      const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Validate file type for Safari iOS - check cả name nếu type rỗng
        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);
        if (!isImage) {
          alert('Vui lòng chọn file ảnh!');
          return;
        }
        
        setUploading(true);
        setUploadStatus('Đang chuẩn bị...');
        
        try {
          const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
          setUploadStatus(`File ${fileSizeMB}MB - Đang nén...`);
          
          // Nén ảnh nếu file quá lớn (>2MB)
          const compressedFile = await compressImage(file, 2, (status) => {
            setUploadStatus(status);
          });
          
          const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(1);
          setUploadStatus(`Đã nén: ${compressedSizeMB}MB - Đang upload...`);

          const data = await window.KTM.cloudinary.uploadImage({
            file: compressedFile,
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
          });
          
          if (data.secure_url) {
            // Xóa ảnh cũ trên Cloudinary khi upload ảnh mới thành công
            if (formData.image && formData.image !== oldImage) {
              deleteCloudinaryImage(formData.image);
            }
            setFormData(prev => ({ ...prev, image: data.secure_url }));
            setUploadStatus('');
          } else {
            console.error('Cloudinary error:', data);
            alert('Upload thất bại: ' + (data.error?.message || 'Lỗi không xác định'));
            setUploadStatus('');
          }
        } catch (err) {
          console.error('Upload error:', err);
          alert('Lỗi: ' + err.message);
          setUploadStatus('');
        }
        setUploading(false);
        e.target.value = '';
      };
      
      // Xóa ảnh hiện tại
      const handleRemoveImage = () => {
        if (formData.image) {
          // Chỉ xóa ngay nếu đây là ảnh mới upload (không phải ảnh gốc của sản phẩm)
          if (formData.image !== oldImage) {
            deleteCloudinaryImage(formData.image);
          }
          setFormData(prev => ({ ...prev, image: '' }));
        }
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        // Xóa ảnh cũ nếu đã thay bằng ảnh mới
        if (oldImage && formData.image && oldImage !== formData.image) {
          await deleteCloudinaryImage(oldImage);
        }
        // Xóa ảnh cũ nếu đã xóa ảnh
        if (oldImage && !formData.image) {
          await deleteCloudinaryImage(oldImage);
        }
        
        await onSave(formData);
        setSaving(false);
      };

      if (!show) return null;

      return (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down">
            <div className="modal-content" style={{borderRadius: '16px', overflow: 'hidden'}}>
              {/* Header gradient */}
              <div className="modal-header border-0 py-3" style={{background: 'linear-gradient(135deg, #ffc107 0%, #ffca2c 100%)'}}>
                <h6 className="modal-title fw-bold" style={{color: '#1a1a2e'}}>
                  <i className={`fas ${product ? 'fa-edit' : 'fa-plus-circle'} me-2`}></i>
                  {product ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
                </h6>
                <button type="button" className="btn-close" onClick={onClose}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body py-4" style={{maxHeight: '65vh', overflowY: 'auto', background: '#f8f9fa'}}>
                  {/* Image Upload */}
                  <div className="text-center mb-4">
                    <div className="position-relative d-inline-block">
                      {formData.image ? (
                        <>
                          <img src={formData.image} alt="" style={{width: 110, height: 110, objectFit: 'cover', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)'}} />
                          <button 
                            type="button" 
                            className="btn btn-danger position-absolute" 
                            onClick={handleRemoveImage} 
                            style={{top: -10, right: -10, width: 28, height: 28, padding: 0, borderRadius: '50%', boxShadow: '0 2px 8px rgba(220,53,69,0.4)'}}
                          >
                            <i className="fas fa-times" style={{fontSize: '0.75rem'}}></i>
                          </button>
                        </>
                      ) : (
                        <div className="d-flex align-items-center justify-content-center" style={{width: 110, height: 110, borderRadius: '12px', background: 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)', border: '2px dashed #adb5bd'}}>
                          <i className="fas fa-image fa-2x text-muted"></i>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <label className="btn btn-warning btn-sm px-3" style={{borderRadius: '20px'}}>
                        <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-camera'} me-1`}></i>
                        {uploading ? (uploadStatus || 'Đang xử lý...') : 'Chọn ảnh'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                          disabled={uploading}
                          style={{position: 'absolute', left: '-9999px', opacity: 0, width: 1, height: 1}}
                        />
                      </label>
                      {uploading && uploadStatus && (
                        <div className="text-center mt-1" style={{fontSize: 11, color: '#6c757d'}}>
                          {uploadStatus}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-dark mb-1">
                      <i className="fas fa-tag me-1 text-warning"></i>Tên sản phẩm *
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      required 
                      placeholder="VD: Combo Van 3 tay + 2 xylanh"
                      style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small text-dark mb-1">
                        <i className="fas fa-barcode me-1 text-info"></i>Mã SP
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.code} 
                        onChange={(e) => setFormData({...formData, code: e.target.value})} 
                        placeholder="KTM-01"
                        style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small text-dark mb-1">
                        <i className="fas fa-dollar-sign me-1 text-success"></i>Giá
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.price} 
                        onChange={handlePriceChange} 
                        placeholder="1.950.000đ"
                        inputMode="numeric"
                        style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-dark mb-1">
                      <i className="fas fa-percent me-1 text-secondary"></i>Hoa hồng (%)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.commission_percent}
                      min={0}
                      max={100}
                      step={0.01}
                      placeholder="5"
                      onChange={(e) => setFormData({...formData, commission_percent: e.target.value})}
                      style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-dark mb-1">
                      <i className="fas fa-folder me-1 text-primary"></i>Danh mục
                    </label>
                    <select 
                      className="form-select" 
                      value={formData.category} 
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-dark mb-1">
                      <i className="fas fa-sticky-note me-1 text-secondary"></i>Ghi chú
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.note} 
                      onChange={(e) => setFormData({...formData, note: e.target.value})} 
                      placeholder="VD: Thêm dây là 2.150.000đ"
                      style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-dark mb-1">
                      <i className="fas fa-sliders-h me-1 text-secondary"></i>Thuộc tính (cân nặng, chiều dài, ...)
                    </label>
                    <div className="border rounded-3 p-2" style={{ background: '#fff' }}>
                      {(Array.isArray(formData.attributes) ? formData.attributes : []).length === 0 ? (
                        <div className="text-muted small">Chưa có thuộc tính. Ví dụ: Cân nặng, Chiều dài, Vật liệu...</div>
                      ) : null}

                      {(Array.isArray(formData.attributes) ? formData.attributes : []).map((attr, ai) => (
                        <div key={ai} className="row g-2 align-items-center mb-2">
                          <div className="col-5">
                            <input
                              type="text"
                              className="form-control"
                              value={attr?.key || ''}
                              onChange={(e) => {
                                const nextKey = e.target.value;
                                setFormData((prev) => {
                                  const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                  attributes[ai] = { ...(attributes[ai] || {}), key: nextKey };
                                  return { ...prev, attributes };
                                });
                              }}
                              placeholder="Tên (vd: Cân nặng)"
                              style={{ borderRadius: 10 }}
                            />
                          </div>
                          <div className="col-4">
                            <input
                              type="text"
                              className="form-control"
                              value={attr?.value || ''}
                              onChange={(e) => {
                                const nextVal = e.target.value;
                                setFormData((prev) => {
                                  const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                  attributes[ai] = { ...(attributes[ai] || {}), value: nextVal };
                                  return { ...prev, attributes };
                                });
                              }}
                              placeholder="Giá trị (vd: 10)"
                              style={{ borderRadius: 10 }}
                            />
                          </div>
                          <div className="col-2">
                            <input
                              type="text"
                              className="form-control"
                              value={attr?.unit || ''}
                              onChange={(e) => {
                                const nextUnit = e.target.value;
                                setFormData((prev) => {
                                  const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                  attributes[ai] = { ...(attributes[ai] || {}), unit: nextUnit };
                                  return { ...prev, attributes };
                                });
                              }}
                              placeholder="Đơn vị"
                              style={{ borderRadius: 10 }}
                            />
                          </div>
                          <div className="col-1 d-flex justify-content-end">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => {
                                setFormData((prev) => {
                                  const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                  attributes.splice(ai, 1);
                                  return { ...prev, attributes };
                                });
                              }}
                              title="Xóa thuộc tính"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm mt-1"
                        onClick={() => {
                          setFormData((prev) => {
                            const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                            attributes.push({ key: '', value: '', unit: '' });
                            return { ...prev, attributes };
                          });
                        }}
                        style={{ borderRadius: 10 }}
                      >
                        <i className="fas fa-plus me-1"></i>Thêm thuộc tính
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-dark mb-1">
                      <i className="fas fa-layer-group me-1 text-secondary"></i>Biến thể (size, ...)
                    </label>
                    <div className="border rounded-3 p-2" style={{ background: '#fff' }}>
                      {(Array.isArray(formData.variants) ? formData.variants : []).length === 0 ? (
                        <div className="text-muted small">Chưa có biến thể.</div>
                      ) : null}

                      {(Array.isArray(formData.variants) ? formData.variants : []).map((group, gi) => (
                        <div key={gi} className="mb-3">
                          <div className="d-flex gap-2 align-items-center mb-2">
                            <input
                              type="text"
                              className="form-control"
                              value={group?.name || ''}
                              onChange={(e) => {
                                const nextName = e.target.value;
                                setFormData((prev) => {
                                  const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                  variants[gi] = { ...(variants[gi] || {}), name: nextName, options: Array.isArray(variants[gi]?.options) ? variants[gi].options : [] };
                                  return { ...prev, variants };
                                });
                              }}
                              placeholder="Tên nhóm (ví dụ: Size)"
                              style={{ borderRadius: 10 }}
                            />

                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                                onClick={() => applyVariantBulkBasePriceToGroup(gi)}
                                title="Đặt giá giống giá gốc sản phẩm cho tất cả lựa chọn trong nhóm"
                                disabled={!Array.isArray(group?.options) || group.options.length === 0}
                            >
                              Đồng giá
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => {
                                setFormData((prev) => {
                                  const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                  variants.splice(gi, 1);
                                  return { ...prev, variants };
                                });
                              }}
                              title="Xóa nhóm"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>

                          <div className="d-grid gap-2">
                            {(Array.isArray(group?.options) ? group.options : []).map((opt, oi) => (
                              <div key={oi} className="row g-2 align-items-center">
                                <div className="col-7">
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={opt?.label || ''}
                                    onChange={(e) => {
                                      const nextLabel = e.target.value;
                                      setFormData((prev) => {
                                        const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                        const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                        const currentPrice = Number(g.options[oi]?.price ?? 0) || 0;
                                        const currentDigits = String(g.options[oi]?.priceDigits ?? Math.max(0, Math.trunc(currentPrice)));
                                        g.options[oi] = { ...(g.options[oi] || {}), label: nextLabel, price: Math.max(0, Math.trunc(currentPrice)), priceDigits: currentDigits };
                                        variants[gi] = g;
                                        return { ...prev, variants };
                                      });
                                    }}
                                    placeholder="Giá trị (ví dụ: M)"
                                    style={{ borderRadius: 10 }}
                                  />
                                </div>
                                <div className="col-4">
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={formatVND(String(opt?.priceDigits ?? window.KTM.money.getDigits(String(opt?.price ?? ''))))}
                                    onChange={(e) => {
                                      setFormData((prev) => {
                                        const prevDigits = String(opt?.priceDigits ?? window.KTM.money.getDigits(String(opt?.price ?? '')));
                                        const next = window.KTM.money.nextPriceInputState(e.target.value, prevDigits);
                                        const digits = String(next.digits ?? '');
                                        const n = Number(digits);
                                        const nextPrice = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
                                        const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                        const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                        g.options[oi] = { ...(g.options[oi] || {}), label: String(g.options[oi]?.label || ''), price: nextPrice, priceDigits: digits };
                                        variants[gi] = g;
                                        return { ...prev, variants };
                                      });
                                    }}
                                    placeholder="Giá (đ)"
                                    style={{ borderRadius: 10 }}
                                  />
                                </div>
                                <div className="col-1 d-flex justify-content-end">
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => {
                                      setFormData((prev) => {
                                        const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                        const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                        g.options.splice(oi, 1);
                                        variants[gi] = g;
                                        return { ...prev, variants };
                                      });
                                    }}
                                    title="Xóa lựa chọn"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm mt-2"
                            onClick={() => {
                              setFormData((prev) => {
                                const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                const base = getBasePriceInt(prev.price);
                                g.options.push({ label: '', price: base, priceDigits: String(base) });
                                variants[gi] = g;
                                return { ...prev, variants };
                              });
                            }}
                            style={{ borderRadius: 10 }}
                          >
                            <i className="fas fa-plus me-1"></i>Thêm lựa chọn
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="btn btn-outline-warning btn-sm"
                        onClick={() => {
                          setFormData((prev) => {
                            const base = getBasePriceInt(prev.price);
                            const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                            const d = String(base);
                            variants.push({ name: 'Size', options: [{ label: 'S', price: base, priceDigits: d }, { label: 'M', price: base, priceDigits: d }, { label: 'L', price: base, priceDigits: d }] });
                            return { ...prev, variants };
                          });
                        }}
                        style={{ borderRadius: 10 }}
                      >
                        <i className="fas fa-plus me-1"></i>Thêm nhóm biến thể
                      </button>

                      <div className="d-flex gap-2 align-items-center mt-2">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={applyVariantBulkBasePriceAll}
                          disabled={!Array.isArray(formData.variants) || formData.variants.length === 0}
                          style={{ borderRadius: 10 }}
                          title="Đặt giá giống giá gốc sản phẩm cho tất cả lựa chọn ở mọi nhóm"
                        >
                          Đồng giá (tất cả)
                        </button>
                      </div>

                      <div className="text-muted small mt-2">Giá biến thể là giá cụ thể (đ). Ví dụ Size S: 15.000đ, Size M: 25.000đ.</div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label fw-semibold small text-muted mb-1">
                      <i className="fas fa-link me-1"></i>URL ảnh (tùy chọn)
                    </label>
                    <input 
                      type="url" 
                      className="form-control" 
                      placeholder="https://..." 
                      value={formData.image} 
                      onChange={(e) => setFormData({...formData, image: e.target.value})}
                      style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '10px', fontSize: '0.9rem'}}
                    />
                  </div>
                </div>

                <div className="modal-footer border-0 py-3" style={{background: '#fff'}}>
                  <button type="button" className="btn btn-light px-4" onClick={onClose} style={{borderRadius: '10px'}}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-warning px-4 fw-semibold" disabled={saving} style={{borderRadius: '10px', boxShadow: '0 4px 12px rgba(255,193,7,0.3)'}}>
                    {saving ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</>
                    ) : (
                      <><i className="fas fa-check me-2"></i>Lưu sản phẩm</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // Video Modal (Create/Edit)
    function VideoModal({ show, video, onClose, onSave }) {
      const [formData, setFormData] = useState({
        title: '',
        youtube_url: '',
        thumbnail_url: '',
        sort_order: 0
      });
      const [saving, setSaving] = useState(false);
      const [previewThumb, setPreviewThumb] = useState('');

      useEffect(() => {
        if (video) {
          setFormData({
            title: video.title || '',
            youtube_url: `https://www.youtube.com/watch?v=${video.youtubeId}`,
            thumbnail_url: video.thumb || '',
            sort_order: video.sortOrder || 0,
          });
          setPreviewThumb(video.thumb);
        } else {
          setFormData({
            title: '',
            youtube_url: '',
            thumbnail_url: '',
            sort_order: 0
          });
          setPreviewThumb('');
        }
      }, [video, show]);

      const extractYoutubeId = (url) => {
        const match = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
      };

      const handleUrlChange = (url) => {
        setFormData({ ...formData, youtube_url: url });
        const videoId = extractYoutubeId(url);
        if (videoId) {
          setPreviewThumb(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
        }
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSave(formData);
        setSaving(false);
      };

      if (!show) return null;

      return (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{video ? 'Sửa Video' : 'Thêm Video mới'}</h5>
                <button type="button" className="btn-close" onClick={onClose}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Link YouTube *</label>
                    <input
                      type="url"
                      className="form-control"
                      value={formData.youtube_url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... hoặc shorts/..."
                      required
                    />
                    <small className="text-muted">Hỗ trợ: youtube.com/watch, youtu.be, youtube.com/shorts</small>
                  </div>

                  {previewThumb && (
                    <div className="mb-3 text-center">
                      <img src={previewThumb} alt="Preview" className="img-fluid rounded" style={{ maxHeight: '150px' }} />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Tiêu đề *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Thứ tự</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Thumbnail tùy chỉnh (tùy chọn)</label>
                    <input
                      type="url"
                      className="form-control"
                      value={formData.thumbnail_url}
                      onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                      placeholder="Để trống sẽ dùng thumbnail mặc định của YouTube"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-warning" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</> : 'Lưu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // ==================== MAIN APP ====================
    function AdminApp() {
      const [isLoggedIn, setIsLoggedIn] = useState(false);
      const [loginError, setLoginError] = useState('');
      const [currentUser, setCurrentUser] = useState(null);
      const [activeMenu, setActiveMenu] = useState('search');
      const [orderAutoOpenCreateToken, setOrderAutoOpenCreateToken] = useState(null);
      const [orderAutoOpenCreateProductId, setOrderAutoOpenCreateProductId] = useState('');
      const [albums, setAlbums] = useState([]);
      const [selectedAlbum, setSelectedAlbum] = useState(null);
      const [showAlbumModal, setShowAlbumModal] = useState(false);
      const [editingAlbum, setEditingAlbum] = useState(null);
      const [loading, setLoading] = useState(true);
      const [toasts, setToasts] = useState([]);

      const [settings, setSettings] = useState(() => loadAdminSettings());
      
      // Nested folder navigation
      const [currentAlbumFolder, setCurrentAlbumFolder] = useState(null);
      const [albumBreadcrumb, setAlbumBreadcrumb] = useState([]);

      // Check session on mount
      useEffect(() => {
        const session = localStorage.getItem('ktm_admin_session');
        if (session) {
          try {
            const data = JSON.parse(session);
            // Check if session expired (permanent - 100 years)
            if (data.expiry > Date.now()) {
              setIsLoggedIn(true);
              setCurrentUser(data.user);
            } else {
              localStorage.removeItem('ktm_admin_session');
            }
          } catch (e) {
            localStorage.removeItem('ktm_admin_session');
          }
        }
      }, []);

      useEffect(() => {
        if (isLoggedIn) {
          loadAlbums();
        }
      }, [isLoggedIn]);

      useEffect(() => {
        if (!isLoggedIn) return;
        let cancelled = false;

        (async () => {
          try {
            const serverSettings = await fetchAdminSettingsFromServer();
            if (cancelled) return;
            setSettings(serverSettings);
            saveAdminSettings(serverSettings); // cache/fallback
          } catch (err) {
            // Keep local cached settings
          }
        })();

        return () => {
          cancelled = true;
        };
      }, [isLoggedIn]);

      const handleLogin = async (username, password) => {
        setLoginError('');
        
        try {
          const data = await window.KTM.api.postJSON(
            `${API_BASE}/api/auth/login`,
            { username, password },
            'Đăng nhập thất bại'
          );

          // Save session (permanent)
          const session = {
            user: data.user,
            token: data.token,
            expiry: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000 // 100 years (permanent)
          };
          localStorage.setItem('ktm_admin_session', JSON.stringify(session));
          
          setCurrentUser(data.user);
          setIsLoggedIn(true);
        } catch (err) {
          setLoginError(err.message);
        }
      };

      const handleLogout = () => {
        localStorage.removeItem('ktm_admin_session');
        setIsLoggedIn(false);
        setCurrentUser(null);
        setAlbums([]);
        setSelectedAlbum(null);
      };

      const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
      };

      const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
      };

      const loadAlbums = async (parentId = null) => {
        setLoading(true);
        try {
          const url = parentId 
            ? `${API_BASE}/api/albums?parent_id=${parentId}`
            : `${API_BASE}/api/albums?parent_id=root`;
          const data = await window.KTM.api.getJSON(url, 'Lỗi tải danh sách album');
          setAlbums(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error(err);
          showToast('Lỗi tải danh sách album', 'danger');
        }
        setLoading(false);
      };

      const handleCreateAlbum = () => {
        setEditingAlbum(null);
        setShowAlbumModal(true);
      };

      const handleEditAlbum = (album) => {
        setEditingAlbum(album);
        setShowAlbumModal(true);
      };

      const handleSaveAlbum = async (formData) => {
        try {
          const isEditing = editingAlbum && editingAlbum.uuid;
          // Add parent_id if we're in a subfolder
          if (!isEditing && currentAlbumFolder) {
            formData.parent_id = currentAlbumFolder.uuid;
          }
          
          const url = isEditing 
            ? `${API_BASE}/api/albums/${editingAlbum.uuid || editingAlbum.id}` 
            : `${API_BASE}/api/albums`;

          if (isEditing) {
            await window.KTM.api.putJSON(url, formData, 'Lỗi cập nhật');
          } else {
            await window.KTM.api.postJSON(url, formData, 'Lỗi tạo');
          }

          showToast(isEditing ? 'Cập nhật thành công!' : 'Tạo thành công!', 'success');
          setShowAlbumModal(false);
          loadAlbums(currentAlbumFolder?.uuid);
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };

      const handleSelectAlbum = (album) => {
        // Luôn vào bên trong folder (folder = album, có thể chứa cả ảnh lẫn subfolder)
        setSelectedAlbum(album);
      };

      const handleAlbumBack = (target) => {
        if (target === 'root') {
          setAlbumBreadcrumb([]);
          setCurrentAlbumFolder(null);
          loadAlbums(null);
        } else if (target) {
          // Navigate to specific folder in breadcrumb
          const idx = albumBreadcrumb.findIndex(b => b.uuid === target.uuid);
          if (idx >= 0) {
            setAlbumBreadcrumb(albumBreadcrumb.slice(0, idx + 1));
            setCurrentAlbumFolder(target);
            loadAlbums(target.uuid);
          }
        } else {
          // Go up one level
          const newBreadcrumb = [...albumBreadcrumb];
          newBreadcrumb.pop();
          const parentFolder = newBreadcrumb[newBreadcrumb.length - 1] || null;
          setAlbumBreadcrumb(newBreadcrumb);
          setCurrentAlbumFolder(parentFolder);
          loadAlbums(parentFolder?.uuid);
        }
      };

      const handleDeleteAlbum = async (album) => {
        const msg = `Xóa folder "${album.title}"? Tất cả folder con và ảnh bên trong sẽ bị xóa!`;
        if (!confirm(msg)) return;

        try {
          await window.KTM.api.deleteJSON(
            `${API_BASE}/api/albums/${album.uuid || album.id}`,
            'Lỗi xóa album'
          );
          showToast('Đã xóa', 'success');
          loadAlbums(currentAlbumFolder?.uuid);
        } catch (err) {
          showToast('Lỗi xóa album', 'danger');
        }
      };

      // Show login page if not logged in
      if (!isLoggedIn) {
        return <LoginPage onLogin={handleLogin} error={loginError} />;
      }

      const getCurrentMonth = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      };

      function SettingsManager() {
        const [shipPercent, setShipPercent] = useState(() => String(settings?.ship_percent ?? DEFAULT_SHIP_PERCENT));
        const [saving, setSaving] = useState(false);

        useEffect(() => {
          setShipPercent(String(settings?.ship_percent ?? DEFAULT_SHIP_PERCENT));
        }, [settings?.ship_percent]);

        const handleSave = async (e) => {
          e.preventDefault();
          setSaving(true);

          const nextLocal = saveAdminSettings({ ship_percent: shipPercent });

          try {
            const nextServer = await saveAdminSettingsToServer(nextLocal);
            setSettings(nextServer);
            saveAdminSettings(nextServer); // cache
            showToast('Đã lưu cài đặt vào DB', 'success');
          } catch {
            setSettings(nextLocal);
            showToast('Không lưu được DB, đã lưu tạm trên máy', 'warning');
          } finally {
            setSaving(false);
          }
        };

        return (
          <div className="product-manager pb-5 mb-4">
            <div className="product-header">
              <h5 className="mb-0"><i className="fas fa-cog me-2 text-warning"></i>Cài đặt</h5>
            </div>

            <div className="card p-3">
              <form onSubmit={handleSave}>
                <div className="mb-2 text-muted small">
                  Áp dụng cho thống kê hoa hồng khi đơn hàng không ghi phí ship trong ghi chú sản phẩm.
                </div>

                <div className="mb-3">
                  <label className="form-label">Phí ship (%) khi không có ship</label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      value={shipPercent}
                      min="0"
                      max="100"
                      step="0.01"
                      onChange={(e) => setShipPercent(e.target.value)}
                    />
                    <span className="input-group-text">%</span>
                  </div>
                  <div className="form-text">Mặc định: {DEFAULT_SHIP_PERCENT}%</div>
                </div>

                <button type="submit" className="btn btn-warning" disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</> : 'Lưu cài đặt'}
                </button>
              </form>
            </div>
          </div>
        );
      }

      function StatsManager() {
        const [month, setMonth] = useState(getCurrentMonth());
        const [loadingStats, setLoadingStats] = useState(true);
        const createEmptyStats = () => ({
          statusCounts: { draft: 0, pending: 0, processing: 0, done: 0, paid: 0, canceled: 0, other: 0 },
          activeOrders: 0,
          totalQty: 0,
          totalRevenue: 0,
          doneRevenue: 0,
          tempCommission: 0,
          tempCommissionAll: 0,
          products: [],
          customers: [],
          days: [],
          uniqueCustomers: 0,
          avgOrderValue: 0,
          avgQtyPerOrder: 0,
        });

        const [stats, setStats] = useState(createEmptyStats);
        const statsByKeyCacheRef = useRef(new Map());

        const shipPercent = normalizeShipPercent(settings?.ship_percent);

        const {
          formatNumber,
          formatVND
        } = window.KTM.money;
        const loadStatsForMonth = async (m, force = false) => {
          const keyMonth = String(m || '').trim();
          if (!keyMonth) return createEmptyStats();
          const cacheKey = `${keyMonth}|${shipPercent}`;
          const cached = statsByKeyCacheRef.current?.get(cacheKey);
          if (!force && cached) return cached;

          const url = `${API_BASE}/api/orders?resource=stats&month=${encodeURIComponent(keyMonth)}&ship_percent=${encodeURIComponent(shipPercent)}`;
          const data = await window.KTM.api.getJSON(url, 'Lỗi tải thống kê');
          const payload = data?.stats && data?.meta ? data.stats : data;
          const normalized = payload && typeof payload === 'object' ? payload : createEmptyStats();
          statsByKeyCacheRef.current?.set(cacheKey, normalized);
          return normalized;
        };

        const loadStats = async (force = false) => {
          setLoadingStats(true);
          try {
            const next = await loadStatsForMonth(month, force);
            setStats(next);
          } catch (e) {
            console.error('Load stats error:', e);
            setStats(createEmptyStats());
          } finally {
            setLoadingStats(false);
          }
        };

        useEffect(() => {
          loadStats();
        }, [month, shipPercent]);

        return (
          <div className="product-manager pb-5 mb-4 stats-manager">
            <Loading show={loadingStats} />
            <div className="product-header">
              <h5 className="mb-0"><i className="fas fa-chart-column me-2 text-warning"></i>Thống kê</h5>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => loadStats(true)} disabled={loadingStats}>
                <i className="fas fa-rotate me-2"></i>Làm mới
              </button>
            </div>

            <div className="product-search">
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-5">
                  <label className="form-label mb-1">Chọn tháng</label>
                  <div className="input-group">
                    <span className="input-group-text" aria-hidden="true"><i className="fas fa-calendar-alt"></i></span>
                    <input
                      type="month"
                      className="form-control"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      aria-label="Chọn tháng"
                    />
                  </div>
                </div>
                <div className="col-12 col-md-7 d-flex gap-2 justify-content-md-end">
                  <div className="d-flex flex-wrap gap-2 align-self-center">
                    <span className="badge rounded-pill bg-secondary bg-opacity-10 text-dark">
                      <i className="fas fa-truck me-1"></i>Ship ước tính: {shipPercent}%
                    </span>
                    <span className="badge rounded-pill bg-dark bg-opacity-10 text-dark">
                      <i className="fas fa-receipt me-1"></i>{formatNumber(stats.activeOrders)} đơn
                    </span>
                    <span className="badge rounded-pill bg-info bg-opacity-10 text-dark">
                      <i className="fas fa-user me-1"></i>{formatNumber(stats.uniqueCustomers)} khách
                    </span>
                    <span className="badge rounded-pill bg-warning bg-opacity-10 text-dark">
                      <i className="fas fa-boxes-stacked me-1"></i>{formatNumber(stats.totalQty)} SL
                    </span>
                    <span className="badge rounded-pill bg-primary bg-opacity-10 text-dark">
                      <i className="fas fa-hand-holding-dollar me-1"></i>
                      Đã nhận tiền: {formatNumber(stats.statusCounts.paid)}/{formatNumber(stats.statusCounts.done)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-2">
              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm bg-dark bg-opacity-10">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-muted small">Tổng đơn (không tính hủy/nháp)</div>
                    <i className="fas fa-receipt text-dark"></i>
                  </div>
                  <div className="fs-4 fw-semibold text-dark">{formatNumber(stats.activeOrders)}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm bg-warning bg-opacity-10">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-muted small">Doanh thu (tạm tính)</div>
                    <i className="fas fa-sack-dollar text-warning"></i>
                  </div>
                  <div className="fs-4 fw-semibold text-dark">{formatVND(stats.totalRevenue)}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm bg-success bg-opacity-10">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-muted small">Doanh thu (Hoàn thành)</div>
                    <i className="fas fa-circle-check text-success"></i>
                  </div>
                  <div className="fs-4 fw-semibold text-dark">{formatVND(stats.doneRevenue)}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm bg-info bg-opacity-10">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-muted small">Hoa hồng sẽ nhận (theo % SP - trừ ship ước tính)</div>
                    <i className="fas fa-chart-line text-info"></i>
                  </div>
                  <div className="fs-4 fw-semibold text-dark">{formatVND(stats.tempCommission)}</div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm bg-primary bg-opacity-10">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-muted small">Hoa hồng tổng (theo % SP - trừ ship ước tính)</div>
                    <i className="fas fa-coins text-primary"></i>
                  </div>
                  <div className="fs-4 fw-semibold text-dark">{formatVND(stats.tempCommissionAll)}</div>
                </div>
              </div>
            </div>

            <div className="card p-3 mt-3">
              <div className="d-flex align-items-center justify-content-between">
                <h6 className="mb-0"><i className="fas fa-layer-group me-2 text-warning"></i>Tổng quan trạng thái</h6>
                <span className="badge rounded-pill bg-dark bg-opacity-10 text-dark">
                  SL TB/đơn: {stats.avgQtyPerOrder ? stats.avgQtyPerOrder.toFixed(2) : '0.00'}
                </span>
              </div>
              {/* Mobile: compact cards */}
              <div className="d-md-none mt-2">
                <div className="row g-2">
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-light bg-opacity-10">
                      <div className="text-muted small">Nháp</div>
                      <div className="fw-semibold">{formatNumber(stats.statusCounts.draft)}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-secondary bg-opacity-10">
                      <div className="text-muted small">Chờ xử lý</div>
                      <div className="fw-semibold">{formatNumber(stats.statusCounts.pending)}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-warning bg-opacity-10">
                      <div className="text-muted small">Đang vận chuyển</div>
                      <div className="fw-semibold">{formatNumber(stats.statusCounts.processing)}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-danger bg-opacity-10">
                      <div className="text-muted small">Hủy đơn</div>
                      <div className="fw-semibold">{formatNumber(stats.statusCounts.canceled)}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-success bg-opacity-10">
                      <div className="text-muted small">Hoàn thành</div>
                      <div className="fw-semibold">{formatNumber(stats.statusCounts.done)}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-primary bg-opacity-10">
                      <div className="text-muted small">Đã nhận tiền</div>
                      <div className="fw-semibold">{formatNumber(stats.statusCounts.paid)}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-dark bg-opacity-10">
                      <div className="text-muted small">Tổng SL</div>
                      <div className="fw-semibold">{formatNumber(stats.totalQty)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-none d-md-block table-responsive mt-2">
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>Nháp</th>
                      <th>Chờ xử lý</th>
                      <th>Đang vận chuyển</th>
                      <th>Hủy đơn</th>
                      <th>Hoàn thành</th>
                      <th>Đã nhận tiền</th>
                      <th>Khác</th>
                      <th>Tổng SL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{formatNumber(stats.statusCounts.draft)}</td>
                      <td>{formatNumber(stats.statusCounts.pending)}</td>
                      <td>{formatNumber(stats.statusCounts.processing)}</td>
                      <td>{formatNumber(stats.statusCounts.canceled)}</td>
                      <td>{formatNumber(stats.statusCounts.done)}</td>
                      <td>{formatNumber(stats.statusCounts.paid)}</td>
                      <td>{formatNumber(stats.statusCounts.other)}</td>
                      <td>{formatNumber(stats.totalQty)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-3 mt-3">
              <div className="d-flex align-items-center justify-content-between">
                <h6 className="mb-0"><i className="fas fa-box me-2 text-info"></i>Top sản phẩm</h6>
                <span className="badge rounded-pill bg-info bg-opacity-10 text-dark">Theo doanh thu • Top 10</span>
              </div>
              {/* Mobile: card list */}
              <div className="d-md-none mt-2">
                {stats.products.slice(0, 10).map((p) => (
                  <div key={p.product_id} className="card mb-2 p-2 border-0 shadow-sm border-start border-4 border-info">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="fw-semibold" style={{ minWidth: 0, flex: 1 }}>
                        <div className="text-truncate">{p.product_name}</div>
                        <div className="text-muted small text-truncate">
                          {p.product_code ? `#${p.product_code} • ` : ''}
                          {formatNumber(p.orders)} đơn • {formatNumber(p.quantity)} SL
                        </div>
                      </div>
                      <div className="fw-semibold text-nowrap">{formatVND(p.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-none d-md-block table-responsive mt-2">
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Mã</th>
                      <th>Đơn</th>
                      <th>SL</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.products.slice(0, 10).map((p) => (
                      <tr key={p.product_id}>
                        <td>{p.product_name}</td>
                        <td>{p.product_code || '—'}</td>
                        <td>{formatNumber(p.orders)}</td>
                        <td>{formatNumber(p.quantity)}</td>
                        <td className="fw-semibold">{formatVND(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-3 mt-3">
              <div className="d-flex align-items-center justify-content-between">
                <h6 className="mb-0"><i className="fas fa-user-group me-2 text-warning"></i>Top khách hàng</h6>
                <span className="badge rounded-pill bg-warning bg-opacity-10 text-dark">Theo doanh thu • Top 10</span>
              </div>
              {/* Mobile: card list */}
              <div className="d-md-none mt-2">
                {stats.customers.slice(0, 10).map((c) => (
                  <div key={c.key} className="card mb-2 p-2 border-0 shadow-sm border-start border-4 border-warning">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="fw-semibold" style={{ minWidth: 0, flex: 1 }}>
                        <div className="text-truncate">{c.customer_name || '—'}</div>
                        <div className="text-muted small text-truncate">
                          {c.phone || '—'} • {formatNumber(c.orders)} đơn • {formatNumber(c.quantity)} SL
                        </div>
                      </div>
                      <div className="fw-semibold text-nowrap">{formatVND(c.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-none d-md-block table-responsive mt-2">
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>Khách hàng</th>
                      <th>SĐT</th>
                      <th>Đơn</th>
                      <th>SL</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.customers.slice(0, 10).map((c) => (
                      <tr key={c.key}>
                        <td>{c.customer_name || '—'}</td>
                        <td>{c.phone || '—'}</td>
                        <td>{formatNumber(c.orders)}</td>
                        <td>{formatNumber(c.quantity)}</td>
                        <td className="fw-semibold">{formatVND(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-3 mt-3 mb-4">
              <div className="d-flex align-items-center justify-content-between">
                <h6 className="mb-0"><i className="fas fa-calendar-day me-2 text-success"></i>Theo ngày</h6>
                <span className="badge rounded-pill bg-success bg-opacity-10 text-dark">DT (tạm tính) & hoàn thành</span>
              </div>
              {/* Mobile: card list */}
              <div className="d-md-none mt-2">
                {stats.days.map((d) => (
                  <div key={d.day} className="card mb-2 p-2 border-0 shadow-sm border-start border-4 border-success">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="fw-semibold">{d.day}</div>
                        <div className="text-muted small">
                          {formatNumber(d.orders)} đơn • {formatNumber(d.quantity)} SL
                        </div>
                        <div className="text-muted small">
                          Hoàn thành: {formatNumber(d.doneOrders)} • {formatVND(d.doneRevenue)}
                        </div>
                      </div>
                      <div className="fw-semibold text-nowrap">{formatVND(d.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-none d-md-block table-responsive mt-2">
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Đơn</th>
                      <th>SL</th>
                      <th>DT (tạm tính)</th>
                      <th>Đơn hoàn thành</th>
                      <th>DT hoàn thành</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.days.map((d) => (
                      <tr key={d.day}>
                        <td>{d.day}</td>
                        <td>{formatNumber(d.orders)}</td>
                        <td>{formatNumber(d.quantity)}</td>
                        <td className="fw-semibold">{formatVND(d.revenue)}</td>
                        <td>{formatNumber(d.doneOrders)}</td>
                        <td className="fw-semibold">{formatVND(d.doneRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div>
          <Sidebar 
            activeMenu={activeMenu} 
            onMenuChange={(menu) => {
              setActiveMenu(menu);
              if (menu === 'albums') {
                setCurrentAlbumFolder(null);
                setAlbumBreadcrumb([]);
                loadAlbums(null);
              }
            }} 
            onLogout={handleLogout}
            currentUser={currentUser}
          />
          
          <div className="main-content">
            <header className="admin-topbar" role="banner">
              {(() => {
                const menuMeta = {
                  search: { title: 'Tra cứu', icon: 'fa-search', sub: 'Tìm nhanh sản phẩm/khách/đơn' },
                  albums: { title: 'Album', icon: 'fa-images', sub: 'Quản lý ảnh & folder' },
                  videos: { title: 'Video', icon: 'fa-video', sub: 'Quản lý video & folder' },
                  products: { title: 'Sản phẩm', icon: 'fa-box', sub: 'Danh sách, giá, mô tả' },
                  orders: { title: 'Đơn hàng', icon: 'fa-receipt', sub: 'Tạo & theo dõi trạng thái' },
                  stats: { title: 'Thống kê', icon: 'fa-chart-column', sub: 'Doanh thu & hoa hồng' },
                  settings: { title: 'Cài đặt', icon: 'fa-cog', sub: 'Tuỳ chỉnh hệ thống' },
                };

                const meta = menuMeta[activeMenu] || { title: 'KTM Admin', icon: 'fa-tractor', sub: '' };
                const displayName =
                  currentUser?.username || currentUser?.name || currentUser?.email || 'Admin';

                const breadcrumbText = (() => {
                  if (activeMenu !== 'albums') return '';
                  const items = [];
                  items.push('Root');
                  if (Array.isArray(albumBreadcrumb) && albumBreadcrumb.length > 0) {
                    items.push(...albumBreadcrumb.map(b => b?.title).filter(Boolean));
                  }
                  if (selectedAlbum?.title) items.push(selectedAlbum.title);
                  return items.length > 0 ? items.join(' / ') : '';
                })();

                return (
                  <div className="admin-topbar-inner">
                    <div className="admin-topbar-left">
                      <div className="admin-page-icon" aria-hidden="true">
                        <i className={`fas ${meta.icon}`}></i>
                      </div>
                      <div className="admin-page-title">
                        <div className="admin-page-heading">{meta.title}</div>
                        <div className="admin-page-subtitle">
                          {breadcrumbText || meta.sub}
                        </div>
                      </div>
                    </div>

                    <div className="admin-topbar-right">
                      {activeMenu === 'albums' && (
                        <button
                          className="btn btn-warning btn-sm admin-topbar-action"
                          onClick={handleCreateAlbum}
                          title="Tạo folder"
                        >
                          <i className="fas fa-plus me-2"></i>
                          <span className="d-none d-sm-inline">Folder</span>
                        </button>
                      )}

                      <a
                        href="/"
                        className="btn btn-outline-secondary btn-sm d-none d-md-inline-flex"
                        title="Về trang chủ"
                      >
                        <i className="fas fa-home me-2"></i>Trang chủ
                      </a>

                      <div className="admin-user-chip" title={displayName}>
                        <i className="fas fa-user-circle"></i>
                        <span className="admin-user-chip-name">{displayName}</span>
                      </div>

                      <button
                        className="btn btn-outline-danger btn-sm d-md-none"
                        onClick={handleLogout}
                        title="Đăng xuất"
                      >
                        <i className="fas fa-sign-out-alt"></i>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </header>

            <div className="admin-page-body">
              {activeMenu === 'albums' && !selectedAlbum && (
                <AlbumList
                  albums={albums}
                  loading={loading}
                  currentFolder={currentAlbumFolder}
                  breadcrumb={albumBreadcrumb}
                  onSelect={handleSelectAlbum}
                  onCreate={handleCreateAlbum}
                  onEdit={handleEditAlbum}
                  onDelete={handleDeleteAlbum}
                  onBack={handleAlbumBack}
                />
              )}

              {activeMenu === 'search' && (
                <SearchCenter 
                  showToast={showToast} 
                  onNavigate={(menu, action, payload) => {
                    setActiveMenu(menu);
                    if (menu === 'orders' && action === 'create') {
                      setOrderAutoOpenCreateToken(Date.now());
                      setOrderAutoOpenCreateProductId(payload?.productId || '');
                    }
                  }}
                />
              )}

              {activeMenu === 'albums' && selectedAlbum && (
                <AlbumDetail
                  album={selectedAlbum}
                  parentAlbum={albumBreadcrumb.length > 0 ? albumBreadcrumb[albumBreadcrumb.length - 1] : null}
                  onBack={() => {
                    // Go back to parent folder or album list
                    if (selectedAlbum.parentId) {
                      // Find parent in breadcrumb or go to list
                      const parentIdx = albumBreadcrumb.findIndex(b => b.uuid === selectedAlbum.parentId);
                      if (parentIdx >= 0) {
                        setSelectedAlbum(albumBreadcrumb[parentIdx]);
                      } else {
                        setSelectedAlbum(null);
                      }
                    } else {
                      setSelectedAlbum(null);
                    }
                  }}
                  onRefresh={() => loadAlbums(currentAlbumFolder?.uuid)}
                  showToast={showToast}
                  onNavigateToFolder={(folder) => {
                    // Navigate into subfolder - track breadcrumb
                    setAlbumBreadcrumb(prev => [...prev, selectedAlbum]);
                    setSelectedAlbum(folder);
                  }}
                  onEditSubfolder={(folder) => {
                    setEditingAlbum(folder);
                    setShowAlbumModal(true);
                  }}
                />
              )}

              {activeMenu === 'videos' && (
                <VideoList
                  showToast={showToast}
                />
              )}

              {activeMenu === 'products' && (
                <ProductManager showToast={showToast} settings={settings} />
              )}
              {activeMenu === 'orders' && (
                <OrderManager
                  autoOpenCreateToken={orderAutoOpenCreateToken}
                  autoOpenCreateProductId={orderAutoOpenCreateProductId}
                  showToast={showToast}
                />
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

          {/* Toast container */}
          <div className="toast-container">
            {toasts.map(toast => (
              <Toast
                key={toast.id}
                message={toast.message}
                type={toast.type}
                onClose={() => removeToast(toast.id)}
              />
            ))}
          </div>
        </div>
      );
    }

    ReactDOM.render(<AdminApp />, document.getElementById('root'));
    // OrderManager component
    function OrderManager({ autoOpenCreateToken, autoOpenCreateProductId, showToast }) {
      const [orders, setOrders] = useState([]);
      const [ordersPageOffset, setOrdersPageOffset] = useState(0);
      const [ordersHasMore, setOrdersHasMore] = useState(false);
      const [loadingMoreOrders, setLoadingMoreOrders] = useState(false);
      const [allOrders, setAllOrders] = useState([]);
      const [loading, setLoading] = useState(true);
      const [loadingAllOrders, setLoadingAllOrders] = useState(false);
      const [draftExpiringOrders, setDraftExpiringOrders] = useState([]);
      const [loadingDraftExpiringOrders, setLoadingDraftExpiringOrders] = useState(false);
      const [orderSearchQuery, setOrderSearchQuery] = useState('');
      const [orderSearchResults, setOrderSearchResults] = useState([]);
      const [orderSearchLoading, setOrderSearchLoading] = useState(false);
      const [orderSearchError, setOrderSearchError] = useState('');
      const [saving, setSaving] = useState(false);
      const [deletingId, setDeletingId] = useState(null);
      const [updatingId, setUpdatingId] = useState(null);
      const [splitting, setSplitting] = useState(false);
      const [filterMonth, setFilterMonth] = useState(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      });
      const [filterStatus, setFilterStatus] = useState('');
      const [overdueOnly, setOverdueOnly] = useState(false);
      const [showModal, setShowModal] = useState(false);

      // Ops inspector drawer
      const [inspectorOpen, setInspectorOpen] = useState(false);
      const [inspectorOrder, setInspectorOrder] = useState(null);
      const [inspectorLoading, setInspectorLoading] = useState(false);
      const [inspectorError, setInspectorError] = useState('');
      const inspectorRequestIdRef = useRef(0);
      const [customerLookup, setCustomerLookup] = useState(null);
      const [showPhoneHistory, setShowPhoneHistory] = useState(false);
      const [phoneHistoryOrders, setPhoneHistoryOrders] = useState([]);
      const [phoneHistoryLoading, setPhoneHistoryLoading] = useState(false);
      const [splitDeliverNow, setSplitDeliverNow] = useState([]);
      const [form, setForm] = useState({
        customer_name: "",
        phone: "",
        address: "",
        note: "",
        items: [{ product_id: "", quantity: 1, unit_price: null, variant: '', variant_json: null }],
        adjustment_items: [{ amount: '', note: '' }],
        // Stored/derived fields (back-compat with API/database)
        adjustment_amount: 0,
        adjustment_note: "",
        status: "pending"
      });
      const [itemSearches, setItemSearches] = useState(['']);
      const [openProductDropdownIdx, setOpenProductDropdownIdx] = useState(null);
      const productDropdownRefs = useRef({});
      const [products, setProducts] = useState([]);
      const [editingId, setEditingId] = useState(null);
      const lastAutoOpenCreateTokenRef = useRef(null);
      const phoneLookupTimerRef = useRef(null);
      const phoneLookupRequestIdRef = useRef(0);
      const phoneHistoryTimerRef = useRef(null);
      const phoneHistoryRequestIdRef = useRef(0);
      const phoneHistoryCacheRef = useRef(new Map());
      const orderSearchTimerRef = useRef(null);
      const orderSearchRequestIdRef = useRef(0);
      const orderSearchCacheRef = useRef(new Map());
      const customerLookupCacheRef = useRef(new Map());
      const lastLookupPhoneRef = useRef('');
      const orderModalBodyRef = useRef(null);
      const lastItemsLenRef = useRef(0);
      const lastCreatedOrderRef = useRef(null); // { id, fingerprint, ts }
      const PHONE_LOOKUP_MIN_LEN = 9;
      const PHONE_LOOKUP_DEBOUNCE_MS = 150;
      const PHONE_HISTORY_DEBOUNCE_MS = 250;
      const PHONE_HISTORY_CACHE_TTL_MS = 3 * 60 * 1000;
      const CUSTOMER_LOOKUP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
      const CUSTOMER_LOOKUP_CACHE_TTL_NOT_FOUND_MS = 5 * 60 * 1000;
      const CUSTOMER_LOOKUP_CACHE_STORAGE_KEY = 'ktm_customer_lookup_cache_v1';
      const CUSTOMER_LOOKUP_CACHE_MAX_ENTRIES = 200;

      const OVERDUE_PENDING_DAYS = 3;
      const DRAFT_AUTO_DELETE_DAYS = 3;
      const DRAFT_WARN_REMAINING_DAYS = 1;
      const DAY_MS = 24 * 60 * 60 * 1000;

      // Search performance knobs
      const ORDER_SEARCH_DEBOUNCE_MS = 120;
      const ORDER_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
      const ORDER_SEARCH_CACHE_MAX_ENTRIES = 80;
      const ORDER_SEARCH_MIN_CHARS = 2;
      const ORDER_SEARCH_MIN_DIGITS = 4;

      // Orders list performance knobs
      const ORDERS_PAGE_SIZE = 60;

      const isSearchActive = React.useMemo(() => {
        return String(orderSearchQuery || '').trim().length > 0;
      }, [orderSearchQuery]);

      const normalizeSearchQuery = (value) => {
        return String(value || '').replace(/\s+/g, ' ').trim();
      };

      const getSearchDigits = (value) => String(value || '').replace(/[^0-9]+/g, '');

      const getOrderAgeDays = (order) => {
        try {
          const t = new Date(order?.created_at).getTime();
          if (!Number.isFinite(t)) return 0;
          const diff = Date.now() - t;
          if (!Number.isFinite(diff) || diff <= 0) return 0;
          return Math.floor(diff / DAY_MS);
        } catch {
          return 0;
        }
      };

      const isOverduePending = (order) => {
        const status = String(order?.status || '').trim();
        if (status !== 'pending') return false;
        return getOrderAgeDays(order) >= OVERDUE_PENDING_DAYS;
      };

      const normalizeOrderStatus = (raw) => {
        const s = String(raw ?? '').trim().toLowerCase();
        if (s === 'cancelled') return 'canceled';
        return s;
      };

      const getDraftRemainingDays = (order) => {
        const status = normalizeOrderStatus(order?.status);
        if (status !== 'draft') return null;
        const remaining = DRAFT_AUTO_DELETE_DAYS - getOrderAgeDays(order);
        return Number.isFinite(remaining) ? remaining : null;
      };

      const isDraftExpiringSoon = (order) => {
        const remaining = getDraftRemainingDays(order);
        if (!Number.isFinite(remaining)) return false;
        return remaining > 0 && remaining <= DRAFT_WARN_REMAINING_DAYS;
      };

      const resetOrderForm = (presetProductId) => {
        setForm({
          customer_name: "",
          phone: "",
          address: "",
          note: "",
          items: [{ product_id: presetProductId || "", quantity: 1, unit_price: null, variant: '', variant_json: null }],
          adjustment_items: [{ amount: '', note: '' }],
          adjustment_amount: 0,
          adjustment_note: "",
          status: "pending"
        });
        setItemSearches(['']);
        setCustomerLookup(null);
        setOpenProductDropdownIdx(null);
      };

      useEffect(() => {
        const onDocMouseDown = (e) => {
          if (openProductDropdownIdx == null) return;
          const el = productDropdownRefs.current?.[openProductDropdownIdx];
          if (el && !el.contains(e.target)) {
            setOpenProductDropdownIdx(null);
          }
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
      }, [openProductDropdownIdx]);

      const parseMoney = (value) => {
        return window.KTM.money.parseMoney(value);
      };

      const parseSignedMoney = (value) => window.KTM.money.parseSignedMoney(value);

      const formatVND = (n) => window.KTM.money.formatVND(n);

      const normalizeAdjustmentFormItems = (raw) => {
        const arr = Array.isArray(raw) ? raw : [];
        const items = arr.map((it) => ({
          amount: String(it?.amount ?? ''),
          note: String(it?.note ?? ''),
        }));
        return items.length ? items : [{ amount: '', note: '' }];
      };

      const getAdjustmentFormItemsFromOrder = (order) => {
        try {
          const items = window.KTM.orders.getOrderAdjustmentItems(order);
          const ui = (Array.isArray(items) ? items : [])
            .map((it) => ({
              amount: it?.amount === 0 ? '' : String(it?.amount ?? ''),
              note: String(it?.note ?? '').trim(),
            }))
            .filter((it) => String(it.amount || '').trim() || String(it.note || '').trim());
          return ui.length ? ui : [{ amount: '', note: '' }];
        } catch {
          return [{ amount: '', note: '' }];
        }
      };

      const cleanAdjustmentItemsForPayload = (formItems) => {
        const arr = Array.isArray(formItems) ? formItems : [];
        return arr
          .map((it) => ({
            amount: parseSignedMoney(it?.amount),
            note: String(it?.note || '').trim(),
          }))
          .filter((it) => it.amount !== 0 || !!it.note);
      };

      const getAdjustmentDerivedFromForm = (formLike) => {
        const adjFormItems = Array.isArray(formLike?.adjustment_items) ? formLike.adjustment_items : [];
        const cleanAdjItems = cleanAdjustmentItemsForPayload(adjFormItems);
        const amount = computeAdjustmentSum(cleanAdjItems);
        const summaryText = (() => {
          if (!cleanAdjItems.length) return '';
          const notes = cleanAdjItems
            .map((it) => String(it?.note || '').trim())
            .filter(Boolean);
          if (notes.length) return notes.join(' • ');
          return cleanAdjItems.length > 1 ? `${cleanAdjItems.length} mục` : '';
        })();
        return { cleanAdjItems, amount, summaryText };
      };

      const computeAdjustmentSum = (payloadItems) => {
        const arr = Array.isArray(payloadItems) ? payloadItems : [];
        return arr.reduce((sum, it) => sum + (Number(it?.amount) || 0), 0);
      };

      const serializeAdjustmentItems = (payloadItems) => {
        const arr = Array.isArray(payloadItems) ? payloadItems : [];
        return arr.length ? JSON.stringify(arr) : '';
      };

      const parseShipFeeFromNote = (note) => window.KTM.money.parseShipFeeFromNote(note);

      const isValidPhone = (normalizedDigits) => window.KTM.phone.isValid(normalizedDigits);

      const normalizePhone = (value) => window.KTM.phone.normalize(value);

      const fetchOrderById = async (orderId) => {
        if (!orderId) return null;
        const data = await window.KTM.api.getJSON(`${API_BASE}/api/orders/${orderId}`, 'Lỗi tải đơn hàng');
        // Some handlers might wrap in {order: ...}
        if (data && typeof data === 'object' && data.order && typeof data.order === 'object') return data.order;
        return data;
      };

      const mergeOrdersById = (prevList, nextList) => {
        const prevArr = Array.isArray(prevList) ? prevList : [];
        const nextArr = Array.isArray(nextList) ? nextList : [];
        if (!prevArr.length) return nextArr;
        if (!nextArr.length) return prevArr;
        const map = new Map(prevArr.map((o) => [String(o?.id ?? ''), o]));
        for (const o of nextArr) {
          const id = String(o?.id ?? '');
          if (!id) continue;
          map.set(id, o);
        }
        return Array.from(map.values());
      };

      const ensureFullOrder = async (order) => {
        if (!order?.id) return order;
        // If we already have any items array with content, assume it's full enough.
        if (Array.isArray(order.items) && order.items.length) return order;
        try {
          const full = await fetchOrderById(order.id);
          if (full && typeof full === 'object') {
            setOrders((prev) => (
              Array.isArray(prev)
                ? prev.map((o) => (String(o?.id) === String(order.id) ? full : o))
                : prev
            ));
            return full;
          }
        } catch (e) {
          console.error('Fetch order by id error:', e);
        }
        return order;
      };

      const loadCustomerLookupCache = () => {
        try {
          const raw = localStorage.getItem(CUSTOMER_LOOKUP_CACHE_STORAGE_KEY);
          if (!raw) return;
          const obj = JSON.parse(raw);
          if (!obj || typeof obj !== 'object') return;
          const entries = Object.entries(obj);
          for (const [phone, value] of entries) {
            if (!phone || !value || typeof value !== 'object') continue;
            customerLookupCacheRef.current?.set(String(phone), value);
          }
        } catch {
          // ignore
        }
      };

      const persistCustomerLookupCache = () => {
        try {
          const map = customerLookupCacheRef.current;
          if (!map || typeof map.entries !== 'function') return;

          const arr = Array.from(map.entries())
            .filter(([k, v]) => k && v && typeof v === 'object' && Number.isFinite(v.ts))
            .sort((a, b) => (Number(b[1].ts) || 0) - (Number(a[1].ts) || 0))
            .slice(0, CUSTOMER_LOOKUP_CACHE_MAX_ENTRIES);

          const obj = {};
          for (const [k, v] of arr) obj[k] = v;
          localStorage.setItem(CUSTOMER_LOOKUP_CACHE_STORAGE_KEY, JSON.stringify(obj));
        } catch {
          // ignore
        }
      };

      useEffect(() => {
        loadCustomerLookupCache();
      }, []);

      const getPrefillFromOrders = (phone) => {
        const p = normalizePhone(phone);
        if (!p) return null;
        const list = Array.isArray(orders) ? orders : [];
        let best = null;
        let bestT = -1;
        for (const o of list) {
          if (!o) continue;
          if (normalizePhone(o.phone || '') !== p) continue;
          const t = new Date(o.created_at).getTime();
          const tt = Number.isFinite(t) ? t : 0;
          if (tt >= bestT) {
            bestT = tt;
            best = o;
          }
        }
        if (!best) return null;
        return {
          name: String(best.customer_name || '').trim(),
          address: String(best.address || '').trim(),
        };
      };

      const applyCustomerPrefill = (customer, phone) => {
        if (!customer) return;
        setForm((prev) => {
          if (phone && normalizePhone(prev.phone) !== phone) return prev;
          return {
            ...prev,
            customer_name: customer.name || prev.customer_name,
            address: customer.address || prev.address,
          };
        });
      };

      const applyQuickPrefillFromOrders = (phone) => {
        const pre = getPrefillFromOrders(phone);
        if (!pre) return;
        const p = normalizePhone(phone);
        setForm((prev) => {
          if (p && normalizePhone(prev.phone) !== p) return prev;
          const next = { ...prev };
          if (!String(prev.customer_name || '').trim() && pre.name) next.customer_name = pre.name;
          if (!String(prev.address || '').trim() && pre.address) next.address = pre.address;
          return next;
        });
      };

      const upsertCustomerLookupCacheFromForm = (rawPhone, rawName, rawAddress) => {
        try {
          const phone = normalizePhone(rawPhone);
          if (!phone) return;

          const name = String(rawName || '').trim();
          const address = String(rawAddress || '').trim();

          // Avoid overwriting an existing cached profile with blanks.
          if (!name && !address) return;

          customerLookupCacheRef.current?.set(phone, {
            ts: Date.now(),
            status: 'found',
            customer: {
              phone,
              name: name || null,
              address: address || null,
            },
          });
          persistCustomerLookupCache();
        } catch {
          // ignore
        }
      };

      const lookupCustomerByPhone = async (rawPhone) => {
        const phone = normalizePhone(rawPhone);
        if (!phone) return;

        // Instant perceived speed: prefill from recent orders even before API responds.
        applyQuickPrefillFromOrders(phone);

        const cached = customerLookupCacheRef.current?.get(phone);
        if (cached && Number.isFinite(cached.ts)) {
          const age = Date.now() - cached.ts;
          const ttl = cached.status === 'found' ? CUSTOMER_LOOKUP_CACHE_TTL_MS : CUSTOMER_LOOKUP_CACHE_TTL_NOT_FOUND_MS;
          if (age >= 0 && age <= ttl) {
            setCustomerLookup({ status: cached.status, phone, customer: cached.customer });
            if (cached.status === 'found' && cached.customer) {
              applyCustomerPrefill(cached.customer, phone);
            }
            return;
          }
        }

        const requestId = ++phoneLookupRequestIdRef.current;
        setCustomerLookup({ status: 'loading', phone });
        try {
          const data = await window.KTM.api.getJSON(
            `${API_BASE}/api/customers?phone=${encodeURIComponent(phone)}`,
            'Lỗi tra cứu khách'
          );
          if (phoneLookupRequestIdRef.current !== requestId) return;

          if (data && data.exists && data.customer) {
            customerLookupCacheRef.current?.set(phone, { ts: Date.now(), status: 'found', customer: data.customer });
            persistCustomerLookupCache();
            setCustomerLookup({ status: 'found', phone, customer: data.customer });
            applyCustomerPrefill(data.customer, phone);
            return;
          }

          customerLookupCacheRef.current?.set(phone, { ts: Date.now(), status: 'not-found', customer: null });
          persistCustomerLookupCache();
          setCustomerLookup({ status: 'not-found', phone });
        } catch (e) {
          if (phoneLookupRequestIdRef.current !== requestId) return;
          console.error('Customer lookup error:', e);
          setCustomerLookup({ status: 'error', phone });
        }
      };

      const handlePhoneChange = (nextPhone) => {
        const digitsOnly = normalizePhone(nextPhone);
        // Quick prefill from recent orders (instant) while typing.
        const pre = getPrefillFromOrders(digitsOnly);
        setForm((prev) => {
          const next = { ...prev, phone: digitsOnly };
          if (pre) {
            if (!String(prev.customer_name || '').trim() && pre.name) next.customer_name = pre.name;
            if (!String(prev.address || '').trim() && pre.address) next.address = pre.address;
          }
          return next;
        });
        setShowPhoneHistory(false);

        if (phoneLookupTimerRef.current) {
          clearTimeout(phoneLookupTimerRef.current);
          phoneLookupTimerRef.current = null;
        }

        const normalized = digitsOnly;
        if (normalized.length < PHONE_LOOKUP_MIN_LEN) {
          setCustomerLookup(null);
          return;
        }

        // If phone is already valid (paste / complete), lookup immediately for best perceived speed.
        if (isValidPhone(normalized) && normalized !== lastLookupPhoneRef.current) {
          lastLookupPhoneRef.current = normalized;
          lookupCustomerByPhone(normalized);
          return;
        }

        phoneLookupTimerRef.current = setTimeout(() => {
          const p = normalizePhone(digitsOnly);
          if (!isValidPhone(p)) return;
          if (p === lastLookupPhoneRef.current) return;
          lastLookupPhoneRef.current = p;
          lookupCustomerByPhone(p);
        }, PHONE_LOOKUP_DEBOUNCE_MS);
      };

      const handlePhoneBlur = () => {
        const normalized = normalizePhone(form.phone);
        if (normalized.length < PHONE_LOOKUP_MIN_LEN) return;
        if (!isValidPhone(normalized)) return;
        if (normalized === lastLookupPhoneRef.current) return;
        lastLookupPhoneRef.current = normalized;
        lookupCustomerByPhone(normalized);
      };

      // Lock background scroll + hide bottom nav when modal open (especially on iOS)
      useEffect(() => {
        if (showModal) {
          document.body.classList.add('order-modal-open');
          document.body.style.overflow = 'hidden';
        } else {
          document.body.classList.remove('order-modal-open');
          document.body.style.overflow = '';
        }
        return () => {
          document.body.classList.remove('order-modal-open');
          document.body.style.overflow = '';
        };
      }, [showModal]);

      const itemsLen = Array.isArray(form.items) ? form.items.length : 0;
      useEffect(() => {
        if (!showModal) {
          lastItemsLenRef.current = itemsLen;
          return;
        }

        if (itemsLen > lastItemsLenRef.current) {
          setTimeout(() => {
            const el = orderModalBodyRef.current;
            if (!el) return;
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
          }, 0);
        }

        lastItemsLenRef.current = itemsLen;
      }, [showModal, itemsLen]);

      useEffect(() => {
        return () => {
          if (phoneLookupTimerRef.current) {
            clearTimeout(phoneLookupTimerRef.current);
            phoneLookupTimerRef.current = null;
          }
          if (phoneHistoryTimerRef.current) {
            clearTimeout(phoneHistoryTimerRef.current);
            phoneHistoryTimerRef.current = null;
          }
        };
      }, []);

      useEffect(() => {
        // Keep phone history accurate without requiring full month orders loaded.
        if (!showModal) return;

        if (phoneHistoryTimerRef.current) {
          clearTimeout(phoneHistoryTimerRef.current);
          phoneHistoryTimerRef.current = null;
        }

        const phone = normalizePhone(form?.phone || '');
        if (!isValidPhone(phone)) {
          setPhoneHistoryOrders([]);
          setPhoneHistoryLoading(false);
          return;
        }

        phoneHistoryTimerRef.current = setTimeout(async () => {
          const key = String(phone);
          const cached = phoneHistoryCacheRef.current?.get(key);
          if (cached && Number.isFinite(cached.ts) && (Date.now() - cached.ts) <= PHONE_HISTORY_CACHE_TTL_MS) {
            setPhoneHistoryOrders(Array.isArray(cached.orders) ? cached.orders : []);
            setPhoneHistoryLoading(false);
            return;
          }

          const requestId = ++phoneHistoryRequestIdRef.current;
          setPhoneHistoryLoading(true);
          try {
            const url = `${API_BASE}/api/orders?search=${encodeURIComponent(phone)}`;
            const data = await window.KTM.api.getJSON(url, 'Lỗi tải lịch sử đơn theo SĐT');
            if (phoneHistoryRequestIdRef.current !== requestId) return;

            const list = Array.isArray(data) ? data : (Array.isArray(data?.orders) ? data.orders : []);
            setPhoneHistoryOrders(list);
            try {
              const cache = phoneHistoryCacheRef.current;
              if (cache && typeof cache.set === 'function') {
                cache.set(key, { ts: Date.now(), orders: list });
                if (cache.size > 100) {
                  // Drop oldest entries
                  const entries = Array.from(cache.entries()).sort((a, b) => (Number(a?.[1]?.ts) || 0) - (Number(b?.[1]?.ts) || 0));
                  const toDrop = Math.max(0, entries.length - 100);
                  for (let i = 0; i < toDrop; i++) cache.delete(entries[i][0]);
                }
              }
            } catch {
              // ignore
            }
          } catch (e) {
            if (phoneHistoryRequestIdRef.current !== requestId) return;
            console.error('Phone history fetch error:', e);
            setPhoneHistoryOrders([]);
          } finally {
            if (phoneHistoryRequestIdRef.current !== requestId) return;
            setPhoneHistoryLoading(false);
          }
        }, PHONE_HISTORY_DEBOUNCE_MS);

        return () => {
          if (phoneHistoryTimerRef.current) {
            clearTimeout(phoneHistoryTimerRef.current);
            phoneHistoryTimerRef.current = null;
          }
        };
      }, [showModal, form?.phone]);

      useEffect(() => {
        loadProducts();
      }, []);

      useEffect(() => {
        // Search mode must show ALL data and be independent of filters.
        // Avoid reloading month-filtered list while searching.
        if (isSearchActive) return;
        loadOrders();
      }, [filterMonth, isSearchActive]);

      useEffect(() => {
        // Always compute overdue alerts on ALL orders (independent from month filter)
        loadAllOrdersForAlerts();
      }, []);

      useEffect(() => {
        if (!autoOpenCreateToken) return;
        if (lastAutoOpenCreateTokenRef.current === autoOpenCreateToken) return;
        lastAutoOpenCreateTokenRef.current = autoOpenCreateToken;
        openCreateModal(autoOpenCreateProductId);
      }, [autoOpenCreateToken]);

      const getStatusLabel = (status) => {
        if (status === 'draft') return 'Đơn nháp';
        if (status === 'pending') return 'Chờ xử lý';
        if (status === 'processing') return 'Đang vận chuyển';
        if (status === 'done') return 'Hoàn thành';
        if (status === 'paid') return 'Đã nhận tiền';
        if (status === 'cancelled') return 'Hủy đơn';
        if (status === 'canceled') return 'Hủy đơn';
        return status || '';
      };

      const getStatusBadgeClass = (status) => {
        if (status === 'draft') return 'bg-light text-dark';
        if (status === 'pending') return 'bg-secondary';
        if (status === 'processing') return 'bg-warning text-dark';
        if (status === 'done') return 'bg-success';
        if (status === 'paid') return 'bg-primary';
        if (status === 'cancelled') return 'bg-danger';
        if (status === 'canceled') return 'bg-danger';
        return 'bg-light text-dark';
      };

      const sortedOrders = React.useMemo(() => {
        return window.KTM.orders.sortOrders(orders);
      }, [orders]);

      const sortedAllOrders = React.useMemo(() => {
        return window.KTM.orders.sortOrders(allOrders);
      }, [allOrders]);

      const overduePendingOrdersAll = React.useMemo(() => {
        const list = Array.isArray(sortedAllOrders) ? sortedAllOrders : [];
        const overdue = list.filter((o) => isOverduePending(o));
        // oldest first
        overdue.sort((a, b) => {
          const ta = new Date(a?.created_at).getTime();
          const tb = new Date(b?.created_at).getTime();
          return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
        });
        return overdue;
      }, [sortedAllOrders]);

      const draftExpiringOrdersAll = React.useMemo(() => {
        const list = Array.isArray(draftExpiringOrders) ? draftExpiringOrders : [];
        const expiring = list.filter((o) => {
          // Server should already send only expiring drafts, but keep a safe client filter too.
          return isDraftExpiringSoon(o);
        });
        expiring.sort((a, b) => {
          const ta = new Date(a?.created_at).getTime();
          const tb = new Date(b?.created_at).getTime();
          return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
        });
        return expiring;
      }, [draftExpiringOrders]);

      const displayOrders = React.useMemo(() => {
        if (overdueOnly) return overduePendingOrdersAll;
        return sortedOrders;
      }, [overdueOnly, overduePendingOrdersAll, sortedOrders]);

      const filteredOrders = React.useMemo(() => {
        // When overdueOnly is enabled, we show the overdue-pending list regardless of other filters.
        if (overdueOnly) return displayOrders;
        const s = String(filterStatus || '').trim();
        if (!s) return displayOrders;
        return (Array.isArray(displayOrders) ? displayOrders : []).filter((o) => String(o?.status || '').trim() === s);
      }, [displayOrders, filterStatus, overdueOnly]);

      const sortedSearchResults = React.useMemo(() => {
        return window.KTM.orders.sortOrders(orderSearchResults);
      }, [orderSearchResults]);

      const ordersToRender = React.useMemo(() => {
        return isSearchActive ? sortedSearchResults : filteredOrders;
      }, [filteredOrders, isSearchActive, sortedSearchResults]);

      const formatDateTime = (value) => window.KTM.date.formatDateTime(value);

      const loadProducts = async () => {
        try {
          const data = await window.KTM.api.getJSON(`${API_BASE}/api/products?fields=order`, 'Lỗi tải sản phẩm');
          setProducts(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error('Load products error:', e);
          setProducts([]);
        }
      };

      const loadOrders = async () => {
        const reset = true;
        setLoading(reset);
        setLoadingMoreOrders(!reset);
        try {
          const params = new URLSearchParams();
          if (filterMonth) params.set('month', String(filterMonth));
          params.set('includeItems', '0');
          params.set('meta', '1');
          params.set('limit', String(ORDERS_PAGE_SIZE));
          params.set('offset', '0');

          const url = `${API_BASE}/api/orders?${params.toString()}`;
          const data = await window.KTM.api.getJSON(url, 'Lỗi tải đơn hàng');

          const list = Array.isArray(data)
            ? data
            : (Array.isArray(data?.orders) ? data.orders : []);
          const meta = (!Array.isArray(data) && data && typeof data === 'object') ? (data.meta || null) : null;

          setOrders(Array.isArray(list) ? list : []);
          setOrdersPageOffset(Array.isArray(list) ? list.length : 0);
          setOrdersHasMore(!!meta?.hasMore);
          // Keep the global overdue snapshot fresh (non-blocking)
          loadAllOrdersForAlerts();
        } catch (e) {
          console.error('Load orders error:', e);
          setOrders([]);
          setOrdersPageOffset(0);
          setOrdersHasMore(false);
        } finally {
          setLoading(false);
          setLoadingMoreOrders(false);
        }
      };

      const loadMoreOrders = async () => {
        if (loading || loadingMoreOrders || isSearchActive) return;
        if (!ordersHasMore) return;

        setLoadingMoreOrders(true);
        try {
          const params = new URLSearchParams();
          if (filterMonth) params.set('month', String(filterMonth));
          params.set('includeItems', '0');
          params.set('meta', '1');
          params.set('limit', String(ORDERS_PAGE_SIZE));
          params.set('offset', String(ordersPageOffset));

          const url = `${API_BASE}/api/orders?${params.toString()}`;
          const data = await window.KTM.api.getJSON(url, 'Lỗi tải đơn hàng');
          const list = Array.isArray(data)
            ? data
            : (Array.isArray(data?.orders) ? data.orders : []);
          const meta = (!Array.isArray(data) && data && typeof data === 'object') ? (data.meta || null) : null;

          setOrders((prev) => mergeOrdersById(prev, Array.isArray(list) ? list : []));
          setOrdersPageOffset((prev) => prev + (Array.isArray(list) ? list.length : 0));
          setOrdersHasMore(!!meta?.hasMore);
        } catch (e) {
          console.error('Load more orders error:', e);
        } finally {
          setLoadingMoreOrders(false);
        }
      };

      const runOrderSearch = async (query) => {
        const q = normalizeSearchQuery(query);
        if (!q) {
          setOrderSearchResults([]);
          setOrderSearchError('');
          setOrderSearchLoading(false);
          return;
        }

        const digits = getSearchDigits(q);
        // Guardrails to prevent huge/slow scans on very short queries.
        if (q.length < ORDER_SEARCH_MIN_CHARS && digits.length < ORDER_SEARCH_MIN_DIGITS) {
          setOrderSearchResults([]);
          setOrderSearchError(`Nhập ít nhất ${ORDER_SEARCH_MIN_CHARS} ký tự (hoặc ${ORDER_SEARCH_MIN_DIGITS} số) để search nhanh`);
          setOrderSearchLoading(false);
          return;
        }

        // Cache hit => instant
        try {
          const cached = orderSearchCacheRef.current?.get(q);
          if (cached && Number.isFinite(cached.ts) && (Date.now() - cached.ts) <= ORDER_SEARCH_CACHE_TTL_MS) {
            setOrderSearchResults(Array.isArray(cached.results) ? cached.results : []);
            setOrderSearchError('');
            setOrderSearchLoading(false);
            return;
          }
        } catch {
          // ignore
        }

        const requestId = ++orderSearchRequestIdRef.current;
        setOrderSearchLoading(true);
        setOrderSearchError('');
        try {
          const url = `${API_BASE}/api/orders?search=${encodeURIComponent(q)}`;
          const data = await window.KTM.api.getJSON(url, 'Lỗi search đơn hàng');
          if (orderSearchRequestIdRef.current !== requestId) return;
          const results = Array.isArray(data) ? data : [];
          setOrderSearchResults(results);

          // Save to cache (keep it bounded)
          try {
            const cache = orderSearchCacheRef.current;
            if (cache && typeof cache.set === 'function') {
              cache.set(q, { ts: Date.now(), results });
              if (cache.size > ORDER_SEARCH_CACHE_MAX_ENTRIES) {
                // Drop oldest entries
                const entries = Array.from(cache.entries()).sort((a, b) => (Number(a?.[1]?.ts) || 0) - (Number(b?.[1]?.ts) || 0));
                const toDrop = Math.max(0, entries.length - ORDER_SEARCH_CACHE_MAX_ENTRIES);
                for (let i = 0; i < toDrop; i++) cache.delete(entries[i][0]);
              }
            }
          } catch {
            // ignore
          }
        } catch (e) {
          if (orderSearchRequestIdRef.current !== requestId) return;
          console.error('Order search error:', e);
          setOrderSearchResults([]);
          setOrderSearchError(e?.message || 'Search lỗi');
        } finally {
          if (orderSearchRequestIdRef.current !== requestId) return;
          setOrderSearchLoading(false);
        }
      };

      useEffect(() => {
        // Search is independent of filters/month; fetch results from server (all data).
        if (orderSearchTimerRef.current) {
          clearTimeout(orderSearchTimerRef.current);
          orderSearchTimerRef.current = null;
        }

        const q = normalizeSearchQuery(orderSearchQuery);
        if (!q) {
          setOrderSearchResults([]);
          setOrderSearchError('');
          setOrderSearchLoading(false);
          return;
        }

        // Ensure filters don't interfere while searching.
        if (overdueOnly) setOverdueOnly(false);

        orderSearchTimerRef.current = setTimeout(() => {
          runOrderSearch(q);
        }, ORDER_SEARCH_DEBOUNCE_MS);

        return () => {
          if (orderSearchTimerRef.current) {
            clearTimeout(orderSearchTimerRef.current);
            orderSearchTimerRef.current = null;
          }
        };
      }, [orderSearchQuery]);

      const loadAllOrdersForAlerts = async () => {
        setLoadingAllOrders(true);
        setLoadingDraftExpiringOrders(true);
        try {
          const [overdueData, draftData] = await Promise.all([
            window.KTM.api.getJSON(
              `${API_BASE}/api/orders?overdue=1&days=${encodeURIComponent(OVERDUE_PENDING_DAYS)}&includeItems=0`,
              'Lỗi tải đơn hàng'
            ),
            window.KTM.api.getJSON(
              `${API_BASE}/api/orders?draftExpiring=1&remainingDays=${encodeURIComponent(DRAFT_WARN_REMAINING_DAYS)}&includeItems=0`,
              'Lỗi tải đơn nháp'
            ),
          ]);

          setAllOrders(Array.isArray(overdueData) ? overdueData : []);
          setDraftExpiringOrders(Array.isArray(draftData) ? draftData : []);
        } catch (e) {
          console.error('Load all orders error:', e);
          setAllOrders([]);
          setDraftExpiringOrders([]);
        } finally {
          setLoadingAllOrders(false);
          setLoadingDraftExpiringOrders(false);
        }
      };

      const editOrder = async (order) => {
        const fullOrder = await ensureFullOrder(order);
        if (!fullOrder) return;
        setEditingId(fullOrder.id);

        const items = Array.isArray(fullOrder.items) && fullOrder.items.length
          ? fullOrder.items.map((it) => ({
              product_id: it?.product_id || '',
              quantity: Number(it?.quantity ?? 1) || 1,
              unit_price: (() => {
                const raw = it?.unit_price ?? it?.unitPrice;
                // IMPORTANT: Number(null) === 0; treat null/empty as "not provided"
                const n = raw == null || raw === '' ? NaN : Number(raw);
                return Number.isFinite(n) ? Math.trunc(n) : null;
              })(),
              variant: String(it?.variant ?? '').trim(),
              variant_json: it?.variant_json ?? it?.variantJson ?? null,
            })).filter((it) => it.product_id)
          : [{ product_id: fullOrder.product_id || '', quantity: Number(fullOrder.quantity || 1) || 1, unit_price: null, variant: '', variant_json: null }];

        const adjFormItems = getAdjustmentFormItemsFromOrder(fullOrder);
        const cleanAdjItems = cleanAdjustmentItemsForPayload(adjFormItems);
        const adjSum = computeAdjustmentSum(cleanAdjItems);
        const adjNoteStored = serializeAdjustmentItems(cleanAdjItems);

        setForm({
          customer_name: fullOrder.customer_name || "",
          phone: normalizePhone(fullOrder.phone || ""),
          address: fullOrder.address || "",
          note: fullOrder?.note || "",
          items: items.length ? items : [{ product_id: "", quantity: 1, unit_price: null, variant: '', variant_json: null }],
          adjustment_items: adjFormItems,
          adjustment_amount: adjSum,
          adjustment_note: adjNoteStored || (fullOrder?.adjustment_note || ""),
          status: fullOrder.status || "pending",
        });
        setItemSearches(new Array(items.length ? items.length : 1).fill(''));
        setSplitDeliverNow(new Array(items.length ? items.length : 1).fill(true));
        setCustomerLookup(null);
        setShowModal(true);

        if (fullOrder.phone) {
          lookupCustomerByPhone(normalizePhone(fullOrder.phone));
        }
      };

      const openOrderInspector = async (order) => {
        if (!order) return;
        setInspectorOpen(true);
        setInspectorError('');
        setInspectorLoading(true);
        setInspectorOrder(order);

        const requestId = ++inspectorRequestIdRef.current;
        try {
          const full = await ensureFullOrder(order);
          if (inspectorRequestIdRef.current !== requestId) return;
          setInspectorOrder(full || order);
        } catch (e) {
          if (inspectorRequestIdRef.current !== requestId) return;
          setInspectorError(e?.message || 'Không tải được chi tiết đơn');
        } finally {
          if (inspectorRequestIdRef.current !== requestId) return;
          setInspectorLoading(false);
        }
      };

      const closeOrderInspector = () => {
        setInspectorOpen(false);
        setInspectorLoading(false);
        setInspectorError('');
      };

      function openCreateModal(presetProductId) {
        setEditingId(null);
        resetOrderForm(presetProductId || '');
        setShowPhoneHistory(false);
        setSplitDeliverNow([]);
        setShowModal(true);
      }

      const closeModal = () => {
        if (saving || splitting) return;
        setShowModal(false);
        setEditingId(null);
        resetOrderForm('');
        setShowPhoneHistory(false);
        setSplitDeliverNow([]);
      };

      const splitOrderDeliverNow = async () => {
        if (!editingId) return;
        if (splitting || saving) return;

        const currentOrder = (Array.isArray(orders) ? orders : []).find((o) => String(o?.id) === String(editingId)) || null;
        const currentStatus = String(currentOrder?.status || form?.status || '').trim();
        if (currentStatus === 'done' || currentStatus === 'paid' || currentStatus === 'canceled') {
          const msg = 'Không thể tách: đơn đã hoàn thành/đã nhận tiền/đã hủy.';
          if (typeof showToast === 'function') showToast(msg, 'warning');
          else alert(msg);
          return;
        }

        const normalizedPhone = normalizePhone(form.phone);
        const items = Array.isArray(form.items) ? form.items : [];
        const normalizedItemsWithIndex = items
          .map((it, idx) => ({
            idx,
            product_id: String(it?.product_id || '').trim(),
            quantity: Number(it?.quantity ?? 0),
            variant: String(it?.variant || '').trim() || null,
            variant_json: it?.variant_json ?? null,
            unit_price: (() => {
              const raw = it?.unit_price;
              // IMPORTANT: Number(null) === 0, so treat null/empty as "not provided"
              // and fall back to computing unit price from product + variant selections.
              const n = raw === '' || raw == null ? NaN : Number(raw);
              if (Number.isFinite(n)) return Math.max(0, Math.trunc(n));
              const p = getProductById(it?.product_id);
              const selections = it?.variant_json && typeof it.variant_json === 'object' ? it.variant_json : null;
              return computeUnitPriceForProductAndSelections(p, selections);
            })(),
          }))
          .filter((it) => it.product_id && Number.isFinite(it.quantity) && it.quantity > 0);

        if (normalizedItemsWithIndex.length < 2) {
          const msg = 'Cần ít nhất 2 sản phẩm để tách đơn.';
          if (typeof showToast === 'function') showToast(msg, 'warning');
          else alert(msg);
          return;
        }

        const selected = [];
        const remaining = [];
        for (const it of normalizedItemsWithIndex) {
          const deliverNow = !!splitDeliverNow[it.idx];
          const row = { product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price, variant: it.variant, variant_json: it.variant_json };
          if (deliverNow) selected.push(row);
          else remaining.push(row);
        }

        if (!selected.length || !remaining.length) {
          const msg = 'Chọn một số sản phẩm “Giao đợt 1”, và để lại ít nhất 1 sản phẩm “Chờ hàng”.';
          if (typeof showToast === 'function') showToast(msg, 'warning');
          else alert(msg);
          return;
        }

        setSplitting(true);
        try {
          const adjFormItems = Array.isArray(form?.adjustment_items) ? form.adjustment_items : [];
          const cleanAdjItems = cleanAdjustmentItemsForPayload(adjFormItems);
          const adjNow = computeAdjustmentSum(cleanAdjItems);
          const adjNoteNow = serializeAdjustmentItems(cleanAdjItems);

          // 1) Create new order for immediate delivery
          const createPayload = {
            customer_name: form.customer_name,
            phone: normalizedPhone,
            address: form.address,
            note: (form.note || '').trim(),
            adjustment_amount: adjNow,
            adjustment_note: adjNoteNow,
            adjustment_items: cleanAdjItems,
            status: 'processing',
            items: selected,
            // Back-compat fields
            product_id: selected[0].product_id,
            quantity: selected[0].quantity,
            // Make the immediate-delivery order the root split (Đợt 1)
            split_seq: 1,
          };

          const created = await window.KTM.api.postJSON(`${API_BASE}/api/orders`, createPayload, 'Lỗi tách đơn (tạo đơn giao ngay)');
          const newId = created?.id ?? created?.order?.id ?? null;

          if (!newId) {
            throw new Error('Tách đơn thất bại: không nhận được ID đơn giao ngay');
          }

          // 2) Update current order with remaining items
          const updatePayload = {
            id: editingId,
            customer_name: form.customer_name,
            phone: normalizedPhone,
            address: form.address,
            note: (form.note || '').trim(),
            adjustment_amount: 0,
            adjustment_note: '',
            adjustment_items: [],
            status: 'pending',
            items: remaining,
            // Back-compat fields
            product_id: remaining[0].product_id,
            quantity: remaining[0].quantity,
            // Link waiting items as Đợt 2 under the new root
            parent_order_id: String(newId),
            split_seq: 2,
          };

          await window.KTM.api.putJSON(`${API_BASE}/api/orders/${editingId}`, updatePayload, 'Lỗi tách đơn (cập nhật phần chờ hàng)');

          closeModal();
          loadOrders();

          const msg = newId ? `Đã tách đơn. Đơn giao ngay: #${newId}` : 'Đã tách đơn.';
          if (typeof showToast === 'function') showToast(msg, 'success');
          else alert(msg);
        } catch (err) {
          console.error(err);
          const msg = err?.message || 'Tách đơn thất bại';
          if (typeof showToast === 'function') showToast(msg, 'danger');
          else alert(msg);
        } finally {
          setSplitting(false);
        }
      };

      const getProductLabel = (productId) => {
        if (!productId) return '-- chọn sản phẩm --';
        const pid = String(productId);
        const p = products.find(x => String(x?.id) === pid);
        if (!p) return '-- chọn sản phẩm --';
        return `${p.name}${p.code ? ` (${p.code})` : ''}`;
      };

      // Match SearchCenter (Tra cứu nhanh) normalization/scoring as closely as possible
      const normalizeText = (value) => {
        try {
          return String(value ?? '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd');
        } catch {
          return String(value ?? '').toLowerCase();
        }
      };

      const parseProductQuery = (query) => {
        const qn = normalizeText(query).trim();
        const tokens = qn.split(/\s+/).filter(Boolean);
        const cleanedQuery = tokens.join(' ');
        return { contentTokens: tokens, cleanedQuery };
      };

      const productSearchIndex = React.useMemo(() => {
        return (Array.isArray(products) ? products : []).map((p, originalIndex) => {
          const name = normalizeText(p?.name ?? '');
          const code = normalizeText(p?.code ?? '');
          const category = normalizeText(p?.category ?? '');
          const note = normalizeText(p?.note ?? '');
          const idStr = normalizeText(p?.id ?? '');
          const sttStr = normalizeText(p?.stt ?? '');
          const haystackAll = `${name} ${code} ${category} ${note} ${idStr} ${sttStr}`.trim();
          return {
            p,
            originalIndex,
            name,
            code,
            category,
            note,
            haystackAll,
          };
        });
      }, [products]);

      const scoreProductMatch = (entry, contentTokens, cleanedQuery) => {
        const tokens = Array.isArray(contentTokens) ? contentTokens : [];
        const phrase = normalizeText(cleanedQuery).trim();
        if (!tokens.length && !phrase) return 0;

        const name = entry?.name ?? '';
        const code = entry?.code ?? '';
        const category = entry?.category ?? '';
        const note = entry?.note ?? '';
        const haystackAll = entry?.haystackAll ?? '';
        if (!haystackAll) return 0;

        let score = 0;

        // Phrase-level boosts
        if (phrase) {
          if (name === phrase) score += 220;
          if (name.includes(phrase)) score += 140;
          if (name.startsWith(phrase)) score += 160;
          if (code && code === phrase) score += 180;
          if (code && code.includes(phrase)) score += 90;
        }

        // Token-level boosts
        for (const t of tokens) {
          if (!t) continue;
          const reWordStart = new RegExp(`(?:^|\\s)${t.replace(/[.*+?^${}()|[\[\]\\]/g, '\\$&')}`);

          if (name.includes(t)) score += 35;
          if (reWordStart.test(name)) score += 25;

          if (code && code.includes(t)) score += 20;
          if (code && reWordStart.test(code)) score += 10;

          if (category && category.includes(t)) score += 12;
          if (note && note.includes(t)) score += 6;
        }

        // Prefer shorter names slightly when tied
        if (score > 0 && name) score += Math.max(0, 10 - Math.min(10, Math.floor(name.length / 10)));

        return score;
      };

      const levenshteinDistance = (a, b) => {
        const s = String(a || '');
        const t = String(b || '');
        if (s === t) return 0;
        if (!s) return t.length;
        if (!t) return s.length;

        const m = s.length;
        const n = t.length;
        // Ensure n is smaller to keep memory minimal
        if (n > m) return levenshteinDistance(t, s);

        let prev = new Array(n + 1);
        let curr = new Array(n + 1);
        for (let j = 0; j <= n; j++) prev[j] = j;

        for (let i = 1; i <= m; i++) {
          curr[0] = i;
          const sc = s.charCodeAt(i - 1);
          for (let j = 1; j <= n; j++) {
            const cost = sc === t.charCodeAt(j - 1) ? 0 : 1;
            curr[j] = Math.min(
              prev[j] + 1,
              curr[j - 1] + 1,
              prev[j - 1] + cost
            );
          }
          const tmp = prev;
          prev = curr;
          curr = tmp;
        }
        return prev[n];
      };

      const fuzzyTokenInText = (token, haystackAll) => {
        const t = String(token || '').trim();
        const hay = String(haystackAll || '');
        if (!t || !hay) return false;
        if (hay.includes(t)) return true;

        const words = hay.split(/\s+/).filter(Boolean);
        if (!words.length) return false;

        // Allow small typos: shorter tokens -> stricter
        const maxDistance = t.length <= 4 ? 1 : 2;
        for (const w of words) {
          // Quick length gate
          if (Math.abs(w.length - t.length) > maxDistance) continue;
          if (levenshteinDistance(t, w) <= maxDistance) return true;
        }
        return false;
      };

      const tokenizeWordsNormalized = (text) => {
        const cleaned = normalizeText(text)
          .replace(/[^a-z0-9]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return cleaned ? cleaned.split(' ').filter(Boolean) : [];
      };

      const fuzzyScoreEntry = (entry, contentTokens) => {
        const tokens = Array.isArray(contentTokens) ? contentTokens : [];
        if (!tokens.length) return 0;

        const nameWords = tokenizeWordsNormalized(entry?.name || '');
        const codeWords = tokenizeWordsNormalized(entry?.code || '');
        const categoryWords = tokenizeWordsNormalized(entry?.category || '');
        const noteWords = tokenizeWordsNormalized(entry?.note || '');

        const bestTokenScoreInWords = (token, words, fieldWeight) => {
          const t = String(token || '').trim();
          if (!t || !words.length) return 0;

          const maxDistance = t.length <= 4 ? 1 : 2;
          let bestDistance = Infinity;
          let bestIndex = -1;

          for (let i = 0; i < words.length; i++) {
            const w = words[i];
            if (!w) continue;
            if (Math.abs(w.length - t.length) > maxDistance) continue;
            const d = levenshteinDistance(t, w);
            if (d < bestDistance) {
              bestDistance = d;
              bestIndex = i;
              if (d === 0) break;
            }
          }

          if (bestDistance === Infinity || bestDistance > maxDistance) return 0;

          // closeness: dist 0 > dist 1 > dist 2
          const closeness = bestDistance === 0 ? 1 : bestDistance === 1 ? 0.65 : 0.45;
          let score = Math.round(fieldWeight * closeness);

          // Prefer matches near beginning of the field
          if (bestIndex === 0) score += Math.round(fieldWeight * 0.25);
          else if (bestIndex === 1) score += Math.round(fieldWeight * 0.12);

          return score;
        };

        let score = 0;
        for (const tok of tokens) {
          if (!tok) continue;
          // Strongly prefer name matches, then code, then category/note
          const sName = bestTokenScoreInWords(tok, nameWords, 180);
          const sCode = bestTokenScoreInWords(tok, codeWords, 120);
          const sCat = bestTokenScoreInWords(tok, categoryWords, 60);
          const sNote = bestTokenScoreInWords(tok, noteWords, 30);
          score += Math.max(sName, sCode, sCat, sNote);
        }

        // If we got here from fuzzy fallback, ensure it can surface even when weak
        if (score > 0) {
          const nameLen = (entry?.name || '').length;
          score += Math.max(0, 60 - Math.min(60, Math.floor(nameLen / 2)));
        }

        return score;
      };

      const productSearchCacheRef = React.useRef(new Map());
      React.useEffect(() => {
        productSearchCacheRef.current = new Map();
      }, [products]);

      const getFilteredProducts = (idx) => {
        const qRaw = String(itemSearches[idx] || '').trim();
        if (!qRaw) return products;

        const { contentTokens, cleanedQuery } = parseProductQuery(qRaw);
        if (contentTokens.length === 0) return products;

        const cacheKey = normalizeText(qRaw).trim();
        const cached = productSearchCacheRef.current.get(cacheKey);
        if (cached) return cached;

        // Basic OR filter across all indexed fields (same spirit as SearchCenter)
        const candidates = [];
        for (const entry of productSearchIndex) {
          const hay = entry.haystackAll;
          if (!hay) continue;
          if (contentTokens.some(word => hay.includes(word))) {
            candidates.push(entry);
          }
        }

        // Fuzzy fallback: when nothing (or too few) matched, broaden using typo-tolerant token match
        let finalCandidates = candidates;
        if (finalCandidates.length < 8 && contentTokens.length > 0) {
          const extra = [];
          const seen = new Set(finalCandidates.map(e => String(e.p?.id ?? '') + ':' + String(e.originalIndex)));
          for (const entry of productSearchIndex) {
            const key = String(entry.p?.id ?? '') + ':' + String(entry.originalIndex);
            if (seen.has(key)) continue;
            const hay = entry.haystackAll;
            if (!hay) continue;

            // Any token fuzzy-matches any word in haystack
            if (contentTokens.some(tok => fuzzyTokenInText(tok, hay))) {
              extra.push(entry);
              seen.add(key);
            }
          }
          if (extra.length) finalCandidates = finalCandidates.concat(extra);
        }

        const scored = finalCandidates
          .map((entry) => ({
            entry,
            score: scoreProductMatch(entry, contentTokens, cleanedQuery),
          }))
          .map((x) => {
            if (x.score > 0) return x;
            // Fuzzy ranking: compute closeness-based score so the most relevant typo-match rises to top
            const fuzzyScore = fuzzyScoreEntry(x.entry, contentTokens);
            return fuzzyScore > 0 ? { ...x, score: fuzzyScore } : x;
          })
          .filter(x => x.score > 0)
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.entry.originalIndex - b.entry.originalIndex;
          })
          .slice(0, 40)
          .map(x => x.entry.p);

        productSearchCacheRef.current.set(cacheKey, scored);
        return scored;
      };

      const getProductById = (pid) => {
        if (!pid) return null;
        const id = String(pid);
        return products.find(x => String(x?.id) === id) || null;
      };

      const normalizeVariantGroups = (v) => {
        if (v == null || v === '') return [];
        let next = v;
        if (typeof next === 'string') {
          const s = next.trim();
          if (!s) return [];
          try {
            next = JSON.parse(s);
          } catch {
            return [];
          }
        }
        if (!Array.isArray(next)) return [];
        return next
          .map((g, gi) => {
            if (!g || typeof g !== 'object') return null;
            const name = String(g.name ?? '').trim() || `Biến thể ${gi + 1}`;
            const options = (Array.isArray(g.options) ? g.options : [])
              .map((o) => {
                if (!o || typeof o !== 'object') return null;
                const label = String(o.label ?? '').trim();
                if (!label) return null;
                const pRaw = o.price ?? o.priceValue ?? o.unit_price ?? o.unitPrice ?? null;
                const pNum = (() => {
                  if (pRaw == null || pRaw === '') return NaN;
                  if (typeof pRaw === 'number') return pRaw;
                  if (typeof pRaw === 'string') return parseMoney(pRaw);
                  return Number(pRaw);
                })();
                const price = Number.isFinite(pNum) ? Math.trunc(pNum) : null;

                const dRaw = o.price_delta ?? o.priceDelta ?? null;
                const dNum = Number(dRaw);
                const price_delta = Number.isFinite(dNum) ? Math.trunc(dNum) : 0;

                return { label, price, price_delta };
              })
              .filter(Boolean);
            return { name, options };
          })
          .filter(Boolean);
      };

      const getVariantGroupsForProductId = (pid) => {
        const p = getProductById(pid);
        return normalizeVariantGroups(p?.variants);
      };

      const buildVariantTextFromSelections = (selections) => {
        if (!selections || typeof selections !== 'object') return '';
        const parts = [];
        for (const [k, v] of Object.entries(selections)) {
          const key = String(k || '').trim();
          const val = String(v || '').trim();
          if (!key || !val) continue;
          parts.push(`${key}: ${val}`);
        }
        return parts.join(', ');
      };

      const computeUnitPriceForProductAndSelections = (product, selections) => {
        const base = parseMoney(product?.price);
        const groups = normalizeVariantGroups(product?.variants);
        if (!groups.length || !selections || typeof selections !== 'object') return base;

        let current = base;
        let hasAbsolute = false;

        for (const g of groups) {
          const groupName = String(g?.name || '').trim();
          const selectedLabel = String(selections?.[groupName] || '').trim();
          if (!groupName || !selectedLabel) continue;
          const opt = (Array.isArray(g.options) ? g.options : []).find((o) => String(o?.label || '').trim() === selectedLabel);
          if (!opt) continue;

          const pRaw = opt?.price;
          const pNum = pRaw == null || pRaw === '' ? NaN : Number(pRaw);
          if (Number.isFinite(pNum)) {
            current = Math.max(0, Math.trunc(pNum));
            hasAbsolute = true;
            continue;
          }

          const dRaw = opt?.price_delta;
          const dNum = dRaw == null || dRaw === '' ? NaN : Number(dRaw);
          if (Number.isFinite(dNum)) current += Math.trunc(dNum);
        }

        return current;
      };

      const getOrderItems = (order) => window.KTM.orders.getOrderItems(order);

      const getOrderTotalQty = (order) => window.KTM.orders.getOrderTotalQty(order);

      const getOrderProductSummary = (order) => window.KTM.orders.getOrderProductSummary(order, getProductById);

      const getOrderItemRows = (order) => window.KTM.orders.getOrderItemRows(order, getProductById);

      const getOrderAdjustmentMoney = (order) => window.KTM.orders.getOrderAdjustmentMoney(order);

      const getOrderAdjustmentSummaryText = (order) => window.KTM.orders.getOrderAdjustmentSummaryText(order);

      const getOrderCopyText = (order) => {
        const items = getOrderItems(order);
        const rows = getOrderItemRows(order);
        const subtotal = getItemsSubtotal(items);
        const shipInfo = getOrderShipInfo(items);
        const ship = shipInfo.fee;
        const adj = getOrderAdjustmentMoney(order);
        const total = subtotal + ship + adj;

        const formatSignedVND = (n) => {
          const num = Number(n) || 0;
          if (num > 0) return `+${formatVND(num)}`;
          return formatVND(num);
        };

        const parts = [];
        if (order?.customer_name) parts.push(`KHÁCH: ${order.customer_name}`);
        if (order?.phone) parts.push(`SĐT: ${order.phone}`);
        if (order?.address) parts.push(`ĐỊA CHỈ: ${order.address}`);
        if ((order?.note || '').trim()) parts.push(`GHI CHÚ: ${(order.note || '').trim()}`);
        parts.push('');

        parts.push('SẢN PHẨM:');
        if (rows.length) {
          for (const r of rows) {
            parts.push(`- ${r.name} (SL: ${r.qty})`);
          }
        } else {
          const summary = getOrderProductSummary(order);
          if (summary && summary !== '—') parts.push(`- ${summary}`);
        }

        parts.push('');
        parts.push(`TẠM TÍNH: ${formatVND(subtotal)}`);
        if (shipInfo.found && ship !== 0) parts.push(`SHIP: ${formatVND(ship)}`);
        {
          const adjItemsRaw = window.KTM.orders.getOrderAdjustmentItems(order);
          const adjItems = (Array.isArray(adjItemsRaw) ? adjItemsRaw : [])
            .map((it) => ({
              amount: Number(it?.amount ?? 0) || 0,
              note: String(it?.note || '').trim(),
            }))
            .filter((it) => it.amount !== 0 || !!it.note);

          const adjNoteSummary = getOrderAdjustmentSummaryText(order);
          const hasAnyAdj = adj !== 0 || adjItems.length > 0 || !!adjNoteSummary;
          if (hasAnyAdj) {
            if (adjItems.length === 1) {
              const it = adjItems[0];
              parts.push(`ĐIỀU CHỈNH: ${formatSignedVND(adj)}${it.note ? ` — ${it.note}` : ''}`);
            } else {
              parts.push(`ĐIỀU CHỈNH: ${formatSignedVND(adj)}${(!adjItems.length && adjNoteSummary) ? ` — ${adjNoteSummary}` : ''}`);
              for (const it of adjItems) {
                parts.push(`- ${formatSignedVND(it.amount)}${it.note ? `: ${it.note}` : ''}`);
              }
            }
          }
        }
        parts.push(`TỔNG: ${formatVND(total)}`);
        return parts.filter(Boolean).join('\n');
      };

      const handleCopyOrder = async (order) => {
        try {
          const fullOrder = await ensureFullOrder(order);
          const text = getOrderCopyText(fullOrder);
          await window.KTM.clipboard.writeText(text);
          if (typeof showToast === 'function') showToast('Đã copy thông tin đơn hàng', 'success');
          else alert('Đã copy thông tin đơn hàng');
        } catch (err) {
          console.error(err);
          if (typeof showToast === 'function') showToast('Copy thất bại (trình duyệt chặn clipboard)', 'danger');
          else alert('Copy thất bại (trình duyệt chặn clipboard)');
        }
      };

      const getOrderShipInfo = (items) => window.KTM.orders.getOrderShipInfo(items, getProductById);

      const getItemsSubtotal = (items) => window.KTM.orders.getItemsSubtotal(items, getProductById);

      const getMonthKey = (dateValue) => {
        try {
          const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
          if (!d || Number.isNaN(d.getTime())) return '';
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          return `${y}-${m}`;
        } catch {
          return '';
        }
      };

      const getActiveMonthKey = () => {
        if (filterMonth) return String(filterMonth);
        return getMonthKey(new Date());
      };

      const makeOrderFingerprint = (nextForm) => {
        const name = String(nextForm?.customer_name || '').trim().toLowerCase();
        const phone = normalizePhone(nextForm?.phone || '');
        const address = String(nextForm?.address || '').trim().toLowerCase();
        const adj = getAdjustmentDerivedFromForm(nextForm).amount;

        const items = Array.isArray(nextForm?.items) ? nextForm.items : [];
        const normalizedItems = items
          .map((it) => ({
            product_id: String(it?.product_id || '').trim(),
            quantity: Number(it?.quantity ?? 0),
            variant: String(it?.variant || '').trim(),
          }))
          .filter((it) => it.product_id && Number.isFinite(it.quantity) && it.quantity > 0)
          .sort((a, b) => {
            if (a.product_id < b.product_id) return -1;
            if (a.product_id > b.product_id) return 1;
            if (a.variant < b.variant) return -1;
            if (a.variant > b.variant) return 1;
            return a.quantity - b.quantity;
          });

        return JSON.stringify({ name, phone, address, items: normalizedItems, adj });
      };

      const phoneMonthHistory = React.useMemo(() => {
        const phone = normalizePhone(form?.phone || '');
        if (!phone) return { count: 0, orders: [], monthKey: getActiveMonthKey() };

        const monthKey = getActiveMonthKey();
        const source = Array.isArray(phoneHistoryOrders) ? phoneHistoryOrders : [];
        const matched = source
          .filter((o) => {
            if (!o) return false;
            if (editingId && String(o.id) === String(editingId)) return false;
            if (normalizePhone(o.phone || '') !== phone) return false;
            const mk = getMonthKey(o.created_at);
            return mk && mk === monthKey;
          })
          .sort((a, b) => {
            const ta = new Date(a.created_at).getTime();
            const tb = new Date(b.created_at).getTime();
            return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
          });

        return { count: matched.length, orders: matched, monthKey };
      }, [phoneHistoryOrders, form?.phone, filterMonth, editingId]);

      const makeOrderFingerprintFromOrder = (order) => {
        const name = String(order?.customer_name || '').trim().toLowerCase();
        const phone = normalizePhone(order?.phone || '');
        const address = String(order?.address || '').trim().toLowerCase();
        const adj = parseSignedMoney(order?.adjustment_amount ?? 0);

        const items = getOrderItems(order);
        const normalizedItems = (Array.isArray(items) ? items : [])
          .map((it) => ({
            product_id: String(it?.product_id || '').trim(),
            quantity: Number(it?.quantity ?? 0),
            variant: String(it?.variant || '').trim(),
          }))
          .filter((it) => it.product_id && Number.isFinite(it.quantity) && it.quantity > 0)
          .sort((a, b) => {
            if (a.product_id < b.product_id) return -1;
            if (a.product_id > b.product_id) return 1;
            if (a.variant < b.variant) return -1;
            if (a.variant > b.variant) return 1;
            return a.quantity - b.quantity;
          });

        return JSON.stringify({ name, phone, address, items: normalizedItems, adj });
      };

      const duplicateMonthOrderWarning = React.useMemo(() => {
        if (editingId) return '';

        const phone = normalizePhone(form?.phone || '');
        if (!phone) return '';

        const monthKey = getActiveMonthKey();
        const currentFp = makeOrderFingerprint(form);

        const list = Array.isArray(phoneHistoryOrders) ? phoneHistoryOrders : [];
        for (const o of list) {
          if (!o) continue;
          if (editingId && String(o.id) === String(editingId)) continue;
          if (normalizePhone(o.phone || '') !== phone) continue;
          const mk = getMonthKey(o.created_at);
          if (!mk || mk !== monthKey) continue;
          const fp = makeOrderFingerprintFromOrder(o);
          if (fp && fp === currentFp) {
            return `Đơn này giống 100% một đơn trong tháng ${monthKey}${o?.id ? ` (#${o.id})` : ''}`;
          }
        }

        return '';
      }, [phoneHistoryOrders, form, filterMonth, editingId]);

      const computeOrderValidation = (nextForm) => {
        const errors = [];
        const warnings = [];

        const name = String(nextForm?.customer_name || '').trim();
        const phone = normalizePhone(nextForm?.phone || '');
        const address = String(nextForm?.address || '').trim();

        if (!name) errors.push('Thiếu tên khách hàng');
        if (!phone) errors.push('Thiếu số điện thoại');
        if (phone && !isValidPhone(phone)) errors.push('Số điện thoại không hợp lệ (cần 9-12 chữ số)');
        if (!address) warnings.push('Thiếu địa chỉ');

        const items = Array.isArray(nextForm?.items) ? nextForm.items : [];
        const selectedItems = items.filter((it) => it && it.product_id);
        if (selectedItems.length === 0) errors.push('Chưa chọn sản phẩm');

        const invalidQty = selectedItems.some((it) => {
          const q = Number(it?.quantity ?? 0);
          return !Number.isFinite(q) || q <= 0;
        });
        if (invalidQty) errors.push('Số lượng phải > 0');

        const seen = new Set();
        let hasDup = false;
        for (const it of selectedItems) {
          const pid = String(it.product_id || '').trim();
          const variant = String(it?.variant || '').trim();
          if (!pid) continue;
          const key = `${pid}||${variant}`;
          if (seen.has(key)) {
            hasDup = true;
            break;
          }
          seen.add(key);
        }
        if (hasDup) warnings.push('Sản phẩm bị trùng dòng (nên gộp số lượng)');

        const subtotal = getItemsSubtotal(selectedItems);
        const shipInfo = getOrderShipInfo(selectedItems);
        const ship = shipInfo?.found ? Number(shipInfo?.fee ?? 0) : 0;
        const adjFormItems = Array.isArray(nextForm?.adjustment_items) ? nextForm.adjustment_items : [];
        const cleanAdjItems = cleanAdjustmentItemsForPayload(adjFormItems);
        const adj = computeAdjustmentSum(cleanAdjItems);
        const hasMissingAdjNote = cleanAdjItems.some((it) => (Number(it?.amount) || 0) !== 0 && !String(it?.note || '').trim());

        if (shipInfo?.found) {
          if (ship >= 200000 || (subtotal > 0 && ship > subtotal * 0.6)) {
            warnings.push(`Ship có vẻ bất thường: ${formatVND(ship)}`);
          }
        }

        if (hasMissingAdjNote) warnings.push('Có điều chỉnh nhưng thiếu ghi chú điều chỉnh');
        const absAdj = Math.abs(adj);
        if (absAdj >= 500000 || (subtotal > 0 && absAdj > subtotal * 0.5)) {
          if (adj !== 0) warnings.push(`Điều chỉnh có vẻ bất thường: ${formatVND(adj)}`);
        }

        return { errors, warnings, canSubmit: errors.length === 0 };
      };

      const orderValidation = React.useMemo(() => {
        return computeOrderValidation(form);
      }, [form, products]);

      const orderFieldIssues = React.useMemo(() => {
        const name = String(form?.customer_name || '').trim();
        const phone = normalizePhone(form?.phone || '');
        const address = String(form?.address || '').trim();

        const items = Array.isArray(form?.items) ? form.items : [];
        const counts = new Map();
        for (const it of items) {
          const pid = String(it?.product_id || '').trim();
          const variant = String(it?.variant || '').trim();
          if (!pid) continue;
          const key = `${pid}||${variant}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }

        const perItem = items.map((it) => {
          const pid = String(it?.product_id || '').trim();
          const q = Number(it?.quantity ?? 0);
          const productError = pid ? '' : 'Chưa chọn sản phẩm';
          const qtyError = Number.isFinite(q) && q > 0 ? '' : 'Số lượng phải > 0';
          const variant = String(it?.variant || '').trim();
          const key = `${pid}||${variant}`;
          const dupWarn = pid && (counts.get(key) || 0) > 1 ? 'Sản phẩm bị trùng dòng (nên gộp số lượng)' : '';
          return { productError, qtyError, dupWarn };
        });

        const selectedItems = items.filter((it) => it && it.product_id);
        const subtotal = getItemsSubtotal(selectedItems);
        const shipInfo = getOrderShipInfo(selectedItems);
        const ship = shipInfo?.found ? Number(shipInfo?.fee ?? 0) : 0;

        const adjFormItems = Array.isArray(form?.adjustment_items) ? form.adjustment_items : [];
        const cleanAdjItems = cleanAdjustmentItemsForPayload(adjFormItems);
        const adj = computeAdjustmentSum(cleanAdjItems);
        const hasMissingAdjNote = cleanAdjItems.some((it) => (Number(it?.amount) || 0) !== 0 && !String(it?.note || '').trim());
        const absAdj = Math.abs(adj);
        const adjustmentNoteWarn = hasMissingAdjNote ? 'Có điều chỉnh nhưng thiếu ghi chú điều chỉnh' : '';
        const adjustmentAbnormalWarn = (adj !== 0 && (absAdj >= 500000 || (subtotal > 0 && absAdj > subtotal * 0.5)))
          ? `Điều chỉnh có vẻ bất thường: ${formatVND(adj)}`
          : '';
        const shipAbnormalWarn = shipInfo?.found && (ship >= 200000 || (subtotal > 0 && ship > subtotal * 0.6))
          ? `Ship có vẻ bất thường: ${formatVND(ship)}`
          : '';

        const nameError = name ? '' : 'Thiếu tên khách hàng';
        const phoneError = !phone
          ? 'Thiếu số điện thoại'
          : (!isValidPhone(phone) ? 'Số điện thoại không hợp lệ (cần 9-12 chữ số)' : '');
        const addressWarn = address ? '' : 'Thiếu địa chỉ';

        const canSubmit = !nameError && !phoneError && perItem.every((x) => !x.productError && !x.qtyError);

        return {
          nameError,
          phoneError,
          addressWarn,
          items: perItem,
          shipAbnormalWarn,
          adjustmentNoteWarn,
          adjustmentAbnormalWarn,
          canSubmit,
        };
      }, [form, products]);

      const saveOrder = async (options) => {
        const mode = options?.mode || 'close'; // 'close' | 'new'

        const validation = computeOrderValidation(form);
        if (!validation.canSubmit) {
          const msg = validation.errors[0] || 'Thiếu dữ liệu bắt buộc';
          if (typeof showToast === 'function') showToast(msg, 'danger');
          else alert(msg);
          return;
        }

        // Confirm only when duplicate order is detected
        if (!editingId && duplicateMonthOrderWarning) {
          const msg = `${duplicateMonthOrderWarning}\n\nBạn có muốn tiếp tục lưu không?`;
          const ok = window.confirm(msg);
          if (!ok) {
            // Help user review: open phone history if any
            if (phoneMonthHistory?.count > 0) setShowPhoneHistory(true);
            setTimeout(() => {
              const el = document.getElementById('order-phone-input');
              if (el && typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                el.focus?.();
              }
            }, 0);
            return;
          }
        }

        const normalizedPhone = normalizePhone(form.phone);
        const items = Array.isArray(form.items) ? form.items : [];
        const normalizedItems = items
          .map((it) => ({
            product_id: it?.product_id || '',
            quantity: Number(it?.quantity ?? 1),
            variant: String(it?.variant || '').trim() || null,
            variant_json: it?.variant_json ?? null,
            unit_price: (() => {
              const raw = it?.unit_price;
              // IMPORTANT: Number(null) === 0, so treat null/empty as "not provided"
              // and fall back to computing unit price from product + variant selections.
              const n = raw === '' || raw == null ? NaN : Number(raw);
              if (Number.isFinite(n)) return Math.max(0, Math.trunc(n));
              const p = getProductById(it?.product_id);
              const selections = it?.variant_json && typeof it.variant_json === 'object' ? it.variant_json : null;
              return computeUnitPriceForProductAndSelections(p, selections);
            })(),
          }))
          .filter((it) => it.product_id && Number.isFinite(it.quantity) && it.quantity > 0);

        setSaving(true);
        try {
          const url = editingId 
            ? `${API_BASE}/api/orders/${editingId}` 
            : `${API_BASE}/api/orders`;

          const primary = normalizedItems[0];
          const adjFormItems = Array.isArray(form?.adjustment_items) ? form.adjustment_items : [];
          const cleanAdjItems = cleanAdjustmentItemsForPayload(adjFormItems);
          const adjAmountNow = computeAdjustmentSum(cleanAdjItems);
          const adjNoteNow = serializeAdjustmentItems(cleanAdjItems);
          const payload = {
            customer_name: form.customer_name,
            phone: normalizedPhone,
            address: form.address,
            note: (form.note || '').trim(),
            adjustment_amount: adjAmountNow,
            adjustment_note: adjNoteNow,
            adjustment_items: cleanAdjItems,
            // Back-compat fields (API will normalize from items anyway)
            product_id: primary.product_id,
            quantity: primary.quantity,
            status: form.status,
            items: normalizedItems,
            ...(editingId ? { id: editingId } : {}),
          };

          if (editingId) {
            await window.KTM.api.putJSON(url, payload, 'Lỗi lưu đơn hàng');
          } else {
            const created = await window.KTM.api.postJSON(url, payload, 'Lỗi lưu đơn hàng');
            lastCreatedOrderRef.current = {
              id: created?.id ?? created?.order?.id ?? null,
              fingerprint: makeOrderFingerprint(form),
              ts: Date.now(),
            };
          }

          // Keep phone->customer cache in sync with edits so future "tạo đơn" prefill is updated.
          upsertCustomerLookupCacheFromForm(normalizedPhone, form.customer_name, form.address);

          if (mode === 'new' && !editingId) {
            resetOrderForm('');
            setEditingId(null);
            setShowModal(true);
          } else {
            resetOrderForm('');
            setEditingId(null);
            setShowModal(false);
          }
          loadOrders();
        } catch (err) {
          console.error(err);
          if (typeof showToast === 'function') showToast(err.message, 'danger');
          else alert(err.message);
          return;
        } finally {
          setSaving(false);
        }
      };

      const getOrderTotalMoney = (order) => window.KTM.orders.getOrderTotalMoney(order, getProductById);

      const deleteOrder = async (id) => {
        if (!confirm("Xóa đơn hàng này?")) return;
        setDeletingId(id);
        try {
          await window.KTM.api.deleteJSON(`${API_BASE}/api/orders/${id}`, 'Lỗi xóa đơn hàng');
          loadOrders();
          loadAllOrdersForAlerts();
        } catch (err) {
          console.error(err);
          if (typeof showToast === 'function') showToast(err.message, 'danger');
          else alert(err.message);
        } finally {
          setDeletingId(null);
        }
      };

      const updateOrderStatus = async (order, nextStatus) => {
        const fullOrder = await ensureFullOrder(order);
        const orderId = fullOrder?.id;
        if (!orderId || !nextStatus) return;

        setUpdatingId(orderId);
        try {
          const items = getOrderItems(fullOrder);
          const normalizedItems = (Array.isArray(items) ? items : [])
            .map((it) => ({
              product_id: it?.product_id || '',
              quantity: Number(it?.quantity ?? 1),
              variant: String(it?.variant || '').trim() || null,
              variant_json: it?.variant_json ?? null,
              unit_price: (() => {
                const raw = it?.unit_price ?? it?.unitPrice;
                const n = Number(raw);
                return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
              })(),
            }))
            .filter((it) => it.product_id && Number.isFinite(it.quantity) && it.quantity > 0);

          if (!normalizedItems.length) {
            throw new Error('Không thể cập nhật trạng thái: đơn không có sản phẩm hợp lệ');
          }

          const primary = normalizedItems[0];
          const payload = {
            id: orderId,
            customer_name: fullOrder?.customer_name || '',
            phone: normalizePhone(fullOrder?.phone || ''),
            address: fullOrder?.address || '',
            note: (fullOrder?.note || '').trim(),
            adjustment_amount: Number(fullOrder?.adjustment_amount ?? 0) || 0,
            adjustment_note: fullOrder?.adjustment_note || '',
            // Back-compat fields
            product_id: primary.product_id,
            quantity: primary.quantity,
            status: nextStatus,
            items: normalizedItems,
          };

          await window.KTM.api.putJSON(`${API_BASE}/api/orders/${orderId}`, payload, 'Lỗi cập nhật trạng thái');

          setOrders((prev) => (
            Array.isArray(prev)
              ? prev.map((o) => (o?.id === orderId ? { ...o, status: nextStatus } : o))
              : prev
          ));

          setAllOrders((prev) => (
            Array.isArray(prev)
              ? prev.map((o) => (o?.id === orderId ? { ...o, status: nextStatus } : o))
              : prev
          ));
          if (typeof showToast === 'function') showToast('Đã cập nhật trạng thái', 'success');
        } catch (err) {
          console.error(err);
          if (typeof showToast === 'function') showToast(err.message, 'danger');
          else alert(err.message);
        } finally {
          setUpdatingId(null);
        }
      };

      return (
        <div className="product-manager">
          <Loading show={(loading && !showModal && !isSearchActive) || saving || !!deletingId || !!updatingId} />
          <div className="product-header">
            <h5>Quản lý đơn hàng</h5>
            <button className="btn btn-dark btn-sm" onClick={openCreateModal} disabled={saving || !!deletingId}>
              <i className="fas fa-plus me-2"></i>Tạo đơn
            </button>
          </div>

          <div className="product-search">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-4">
                <label className="form-label mb-1">Lọc theo tháng</label>
                <div className="input-group">
                  <span className="input-group-text" aria-hidden="true">
                    <i className="fas fa-calendar-alt"></i>
                  </span>
                  <input
                    type="month"
                    className="form-control"
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                    aria-label="Chọn tháng"
                    disabled={overdueOnly || isSearchActive}
                  />
                  {filterMonth && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setFilterMonth('');
                      }}
                      title="Bỏ lọc"
                      aria-label="Bỏ lọc"
                      disabled={loading || isSearchActive}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label mb-1">Trạng thái</label>
                <div className="input-group">
                  <span className="input-group-text" aria-hidden="true">
                    <i className="fas fa-filter"></i>
                  </span>
                  <select
                    className="form-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    aria-label="Lọc theo trạng thái"
                    disabled={overdueOnly || isSearchActive}
                  >
                    <option value="">Tất cả</option>
                    <option value="draft">Đơn nháp</option>
                    <option value="pending">Chờ xử lý</option>
                    <option value="processing">Đang vận chuyển</option>
                    <option value="done">Hoàn thành</option>
                    <option value="paid">Đã nhận tiền</option>
                    <option value="canceled">Hủy đơn</option>
                  </select>
                  {filterStatus && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setFilterStatus('')}
                      title="Bỏ lọc trạng thái"
                      aria-label="Bỏ lọc trạng thái"
                      disabled={loading || isSearchActive}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
                <div className="form-check mt-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="orders-overdue-only"
                    checked={overdueOnly}
                    onChange={(e) => {
                      if (isSearchActive) return;
                      const next = !!e.target.checked;
                      setOverdueOnly(next);
                      if (next) {
                        setFilterStatus('pending');
                      }
                    }}
                    disabled={isSearchActive}
                  />
                  <label className="form-check-label" htmlFor="orders-overdue-only">
                    Chỉ hiện đơn chậm &gt; {OVERDUE_PENDING_DAYS} ngày (Chờ xử lý)
                  </label>
                </div>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label mb-1">Search (tên / SĐT)</label>
                <div className="input-group">
                  <span className="input-group-text" aria-hidden="true">
                    <i className="fas fa-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Nhập tên hoặc SĐT..."
                    aria-label="Search đơn hàng theo tên hoặc SĐT"
                  />
                  {String(orderSearchQuery || '').trim() && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setOrderSearchQuery('')}
                      title="Xóa search"
                      aria-label="Xóa search"
                      disabled={orderSearchLoading}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                  {orderSearchLoading && (
                    <span className="input-group-text" title="Đang search..." aria-label="Đang search">
                      <span className="spinner-border spinner-border-sm text-warning" role="status" aria-hidden="true"></span>
                    </span>
                  )}
                </div>
                <div className="text-muted small mt-1">
                  Search sẽ ra toàn bộ data, bỏ qua filter
                </div>
              </div>
              <div className="col-12 col-md-2 d-flex gap-2 justify-content-md-end">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => (isSearchActive ? runOrderSearch(orderSearchQuery) : loadOrders())}
                  disabled={loading || orderSearchLoading}
                >
                  <i className="fas fa-rotate me-2"></i>Làm mới
                </button>
              </div>
            </div>
          </div>

          <div className="card p-3">
            <div className="d-flex align-items-center justify-content-between">
              <h6 className="mb-0">Danh sách đơn hàng</h6>
              <span className="text-muted small">
                {isSearchActive
                  ? `${ordersToRender.length} kết quả`
                  : (filterStatus ? `${filteredOrders.length}/${orders.length} đơn` : `${orders.length}${ordersHasMore ? '+' : ''} đơn`)
                }
              </span>
            </div>

            {isSearchActive && orderSearchError && (
              <div className="alert alert-danger mt-3 mb-0" role="alert">
                {orderSearchError}
              </div>
            )}

            {overduePendingOrdersAll.length > 0 && (
              <div className="alert alert-warning d-flex align-items-center justify-content-between gap-2 mt-3 mb-0" role="alert">
                <div style={{ minWidth: 0 }}>
                  <i className="fas fa-triangle-exclamation me-2"></i>
                  Có <strong>{overduePendingOrdersAll.length}</strong> đơn <strong>Chờ xử lý</strong> quá {OVERDUE_PENDING_DAYS} ngày.
                  {loadingAllOrders && <span className="ms-2 text-muted small">(đang cập nhật...)</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => {
                    setOverdueOnly(true);
                    setFilterStatus('pending');
                  }}
                >
                  Xem ngay
                </button>
              </div>
            )}

            {draftExpiringOrdersAll.length > 0 && (
              <div className="alert alert-warning d-flex align-items-center justify-content-between gap-2 mt-3 mb-0" role="alert">
                <div style={{ minWidth: 0 }}>
                  <i className="fas fa-clock me-2"></i>
                  Có <strong>{draftExpiringOrdersAll.length}</strong> đơn <strong>Nháp</strong> sắp tự xóa (còn ≤ {DRAFT_WARN_REMAINING_DAYS} ngày).
                  {loadingDraftExpiringOrders && <span className="ms-2 text-muted small">(đang cập nhật...)</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => {
                    setOverdueOnly(false);
                    setFilterStatus('draft');
                    setFilterMonth('');
                    loadOrders();
                  }}
                >
                  Xem ngay
                </button>
              </div>
            )}

            {(isSearchActive ? orderSearchLoading : loading) ? (
              <div className="text-center py-4">
                <div className="spinner-border text-warning"></div>
              </div>
            ) : (isSearchActive ? ordersToRender.length === 0 : orders.length === 0) ? (
              <div className="text-center py-4 text-muted">{isSearchActive ? 'Không có kết quả' : 'Chưa có đơn hàng'}</div>
            ) : (!isSearchActive && filteredOrders.length === 0) ? (
              <div className="text-center py-4 text-muted">Không có đơn phù hợp</div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="d-md-none mt-3">
                  {ordersToRender.map(order => (
                    <div
                      key={order.id}
                      className="card mb-2"
                      role="button"
                      tabIndex={0}
                      onClick={() => openOrderInspector(order)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openOrderInspector(order);
                        }
                      }}
                      title="Xem chi tiết"
                    >
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div className="flex-grow-1" style={{ minWidth: 0 }}>
                            <div className="fw-semibold text-truncate">{order.customer_name}</div>
                            <div className="fw-bold font-monospace">{order.phone}</div>
                            {Number(order?.split_seq ?? 0) > 0 && (
                              <div className="text-muted small">Đợt {order.split_seq}</div>
                            )}
                            {order.address && (
                              <div className="text-muted small" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                {order.address}
                              </div>
                            )}
                            {(order?.note || '').trim() && (
                              <div className="text-muted small" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                <span className="fw-semibold">Ghi chú:</span> {(order.note || '').trim()}
                              </div>
                            )}
                          </div>
                          <div className="d-flex align-items-start gap-1 flex-shrink-0">
                            <span className={`badge ${getStatusBadgeClass(order.status)}`}>{getStatusLabel(order.status)}</span>
                            {isOverduePending(order) && (
                              <span className="badge bg-danger" title={`Chờ xử lý quá ${OVERDUE_PENDING_DAYS} ngày`}>
                                ⚠ Chậm {getOrderAgeDays(order)}d
                              </span>
                            )}
                            {isDraftExpiringSoon(order) && (
                              <span className="badge bg-warning text-dark" title={`Đơn nháp sẽ tự xóa sau ${DRAFT_AUTO_DELETE_DAYS} ngày`}>
                                ⏳ Còn {getDraftRemainingDays(order)}d
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 small">
                          <div>
                            <div className="text-muted">Sản phẩm:</div>
                            {(() => {
                              const rows = getOrderItemRows(order);
                              if (!rows.length) {
                                return (
                                  <div className="fw-semibold" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                    {getOrderProductSummary(order)}
                                  </div>
                                );
                              }
                              return (
                                <div className="mt-1">
                                  {rows.map((r, idx) => (
                                    <div key={idx} className="d-flex justify-content-between gap-2" style={{ lineHeight: 1.25 }}>
                                      <div className="fw-semibold" style={{ minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word', flex: 1 }}>
                                        <span className="text-muted me-1">{idx + 1}.</span>
                                        {r.name}
                                      </div>
                                      <div className="text-muted small text-end text-nowrap" style={{ flexShrink: 0 }}>
                                        x{r.qty}{Number(r.unitPrice) > 0 ? ` • ${formatVND(r.unitPrice)}` : ''}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                          {(getOrderAdjustmentMoney(order) !== 0 || getOrderAdjustmentSummaryText(order)) && (
                            <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                              <span className="text-muted">Điều chỉnh:</span>{' '}
                              <span className="fw-semibold">{formatVND(getOrderAdjustmentMoney(order))}</span>
                              {getOrderAdjustmentSummaryText(order) ? (
                                <span className="text-muted">{' '}({getOrderAdjustmentSummaryText(order)})</span>
                              ) : null}
                            </div>
                          )}
                          <div className="d-flex justify-content-between">
                            <span className="text-muted">Tổng tiền</span>
                            <span className="fw-bold">{formatVND(getOrderTotalMoney(order))}</span>
                          </div>
                          <div className="text-muted"><span>Thời gian:</span> {formatDateTime(order.created_at)}</div>
                        </div>

                        <div className="mt-3 d-flex gap-2">
                          <button type="button" className="btn btn-sm btn-primary flex-fill" onClick={(e) => { e.stopPropagation(); editOrder(order); }} disabled={saving || !!deletingId || updatingId === order.id}>
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary flex-fill"
                            onClick={(e) => { e.stopPropagation(); handleCopyOrder(order); }}
                            disabled={saving || !!deletingId || updatingId === order.id}
                          >
                            <i className="fas fa-copy me-1"></i>Copy
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger flex-fill"
                            onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
                            disabled={saving || deletingId === order.id || updatingId === order.id}
                          >
                            {deletingId === order.id ? (
                              <><span className="spinner-border spinner-border-sm me-2"></span>Đang xóa</>
                            ) : (
                              'Xóa'
                            )}
                          </button>
                        </div>

                        <div className="mt-2 d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning flex-fill"
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order, 'processing'); }}
                            disabled={saving || !!deletingId || updatingId === order.id || order.status === 'processing'}
                            title="Đang vận chuyển"
                          >
                            Processing
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success flex-fill"
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order, 'done'); }}
                            disabled={saving || !!deletingId || updatingId === order.id || order.status === 'done'}
                            title="Hoàn thành"
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary flex-fill"
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order, 'paid'); }}
                            disabled={saving || !!deletingId || updatingId === order.id || order.status === 'paid'}
                            title="Đã nhận tiền"
                          >
                            Paid
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger flex-fill"
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order, 'canceled'); }}
                            disabled={saving || !!deletingId || updatingId === order.id || order.status === 'canceled'}
                            title="Hủy đơn"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="d-none d-md-block">
                  <div className="table-responsive orders-table-wrap mt-3">
                    <table className="table orders-table table-hover align-middle mb-0">
                      <thead>
                      <tr>
                        <th>Khách hàng</th>
                        <th>SĐT</th>
                        <th>Sản phẩm</th>
                        <th>SL</th>
                        <th>Tổng tiền</th>
                        <th>Trạng thái</th>
                        <th>Thời gian</th>
                        <th></th>
                      </tr>
                      </thead>
                      <tbody>
                      {ordersToRender.map(order => (
                        <tr
                          key={order.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => openOrderInspector(order)}
                          title="Xem chi tiết"
                        >
                          <td>
                            <div className="fw-semibold">{order.customer_name}</div>
                            {(order?.note || '').trim() && (
                              <div className="text-muted small" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                <span className="fw-semibold">Ghi chú:</span> {(order.note || '').trim()}
                              </div>
                            )}
                          </td>
                          <td>{order.phone}</td>
                          <td>
                            {(() => {
                              const rows = getOrderItemRows(order);
                              if (!rows.length) return getOrderProductSummary(order);
                              return (
                                <div className="d-grid gap-1">
                                  {rows.map((r, idx) => (
                                    <div key={idx} className="small" style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.2 }}>
                                      <span className="text-muted me-1">{idx + 1}.</span>
                                      <span className="fw-semibold">{r.name}</span>{' '}
                                      <span className="text-muted">x{r.qty}</span>
                                      {Number(r.unitPrice) > 0 && (
                                        <span className="text-muted">{' '}• {formatVND(r.unitPrice)}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                          <td>{getOrderTotalQty(order)}</td>
                          <td className="fw-semibold">{formatVND(getOrderTotalMoney(order))}</td>
                          <td>
                            <div className="d-flex align-items-center gap-1 flex-wrap">
                              <span className={`badge ${getStatusBadgeClass(order.status)}`}>{getStatusLabel(order.status)}</span>
                              {isOverduePending(order) && (
                                <span className="badge bg-danger" title={`Chờ xử lý quá ${OVERDUE_PENDING_DAYS} ngày`}>
                                  ⚠ Chậm {getOrderAgeDays(order)}d
                                </span>
                              )}
                              {isDraftExpiringSoon(order) && (
                                <span className="badge bg-warning text-dark" title={`Đơn nháp sẽ tự xóa sau ${DRAFT_AUTO_DELETE_DAYS} ngày`}>
                                  ⏳ Còn {getDraftRemainingDays(order)}d
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{formatDateTime(order.created_at)}</td>
                          <td>
                            <button type="button" className="btn btn-sm btn-primary me-1" onClick={(e) => { e.stopPropagation(); editOrder(order); }} disabled={saving || !!deletingId || updatingId === order.id}>Sửa</button>
                            <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={(e) => { e.stopPropagation(); handleCopyOrder(order); }} disabled={saving || !!deletingId || updatingId === order.id}>
                              <i className="fas fa-copy"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning me-1"
                              onClick={(e) => { e.stopPropagation(); updateOrderStatus(order, 'processing'); }}
                              disabled={saving || !!deletingId || updatingId === order.id || order.status === 'processing'}
                              title="Đang vận chuyển"
                            >
                              Processing
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success me-1"
                              onClick={(e) => { e.stopPropagation(); updateOrderStatus(order, 'done'); }}
                              disabled={saving || !!deletingId || updatingId === order.id || order.status === 'done'}
                              title="Hoàn thành"
                            >
                              Done
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary me-1"
                              onClick={(e) => { e.stopPropagation(); updateOrderStatus(order, 'paid'); }}
                              disabled={saving || !!deletingId || updatingId === order.id || order.status === 'paid'}
                              title="Đã nhận tiền"
                            >
                              Paid
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger me-1"
                              onClick={(e) => { e.stopPropagation(); updateOrderStatus(order, 'canceled'); }}
                              disabled={saving || !!deletingId || updatingId === order.id || order.status === 'canceled'}
                              title="Hủy đơn"
                            >
                              Hủy
                            </button>
                            <button type="button" className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }} disabled={saving || deletingId === order.id}>
                              {deletingId === order.id ? (
                                <><span className="spinner-border spinner-border-sm me-2"></span>Đang xóa</>
                              ) : (
                                'Xóa'
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {!isSearchActive && ordersHasMore && !overdueOnly && (
                  <div className="d-flex justify-content-center mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={loadMoreOrders}
                      disabled={loading || loadingMoreOrders}
                    >
                      {loadingMoreOrders ? (
                        <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Đang tải thêm...</>
                      ) : (
                        <><i className="fas fa-angle-down me-2"></i>Tải thêm đơn</>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <AdminDrawer
            open={inspectorOpen}
            title={(() => {
              const o = inspectorOrder;
              const id = o?.id ? `#${o.id}` : '';
              const st = o?.status ? `• ${getStatusLabel(o.status)}` : '';
              return `Đơn hàng ${id} ${st}`.trim();
            })()}
            subtitle={(() => {
              const o = inspectorOrder;
              const who = String(o?.customer_name || '').trim();
              const phone = String(o?.phone || '').trim();
              const when = o?.created_at ? formatDateTime(o.created_at) : '';
              return [who || phone || null, when || null].filter(Boolean).join(' • ');
            })()}
            onClose={closeOrderInspector}
            footer={(
              <div className="d-flex flex-wrap gap-2 justify-content-between">
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => inspectorOrder && handleCopyOrder(inspectorOrder)}
                    disabled={!inspectorOrder || inspectorLoading || saving || !!deletingId}
                  >
                    <i className="fas fa-copy me-2"></i>Copy
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => inspectorOrder && editOrder(inspectorOrder)}
                    disabled={!inspectorOrder || inspectorLoading || saving || !!deletingId}
                  >
                    <i className="fas fa-pen me-2"></i>Sửa
                  </button>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-warning"
                    onClick={() => inspectorOrder && updateOrderStatus(inspectorOrder, 'processing')}
                    disabled={!inspectorOrder || inspectorLoading || saving || !!deletingId || updatingId === inspectorOrder?.id || inspectorOrder?.status === 'processing'}
                    title="Đang vận chuyển"
                  >
                    Processing
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    onClick={() => inspectorOrder && updateOrderStatus(inspectorOrder, 'done')}
                    disabled={!inspectorOrder || inspectorLoading || saving || !!deletingId || updatingId === inspectorOrder?.id || inspectorOrder?.status === 'done'}
                    title="Hoàn thành"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => inspectorOrder && updateOrderStatus(inspectorOrder, 'paid')}
                    disabled={!inspectorOrder || inspectorLoading || saving || !!deletingId || updatingId === inspectorOrder?.id || inspectorOrder?.status === 'paid'}
                    title="Đã nhận tiền"
                  >
                    Paid
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => inspectorOrder && updateOrderStatus(inspectorOrder, 'canceled')}
                    disabled={!inspectorOrder || inspectorLoading || saving || !!deletingId || updatingId === inspectorOrder?.id || inspectorOrder?.status === 'canceled'}
                    title="Hủy đơn"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          >
            {inspectorLoading ? (
              <div className="admin-drawer-section">
                <div className="text-muted small mb-2">Đang tải chi tiết…</div>
                <div className="d-flex align-items-center gap-2">
                  <span className="spinner-border spinner-border-sm text-warning" aria-hidden="true"></span>
                  <span className="text-muted">Vui lòng chờ</span>
                </div>
              </div>
            ) : inspectorError ? (
              <div className="alert alert-danger" role="alert">{inspectorError}</div>
            ) : !inspectorOrder ? (
              <div className="text-muted">Chưa có dữ liệu</div>
            ) : (
              <>
                <div className="admin-drawer-section">
                  <h6><i className="fas fa-circle-info me-2 text-warning"></i>Tổng quan</h6>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    <span className={`badge ${getStatusBadgeClass(inspectorOrder.status)}`}>{getStatusLabel(inspectorOrder.status)}</span>
                    {isOverduePending(inspectorOrder) && (
                      <span className="badge bg-danger" title={`Chờ xử lý quá ${OVERDUE_PENDING_DAYS} ngày`}>
                        ⚠ Chậm {getOrderAgeDays(inspectorOrder)}d
                      </span>
                    )}
                    {isDraftExpiringSoon(inspectorOrder) && (
                      <span className="badge bg-warning text-dark" title={`Đơn nháp sẽ tự xóa sau ${DRAFT_AUTO_DELETE_DAYS} ngày`}>
                        ⏳ Còn {getDraftRemainingDays(inspectorOrder)}d
                      </span>
                    )}
                  </div>
                  <div className="admin-kv">
                    <div className="k">Tổng tiền</div>
                    <div className="v">{formatVND(getOrderTotalMoney(inspectorOrder))}</div>
                    <div className="k">Số lượng</div>
                    <div className="v">{getOrderTotalQty(inspectorOrder)}</div>
                    <div className="k">Thời gian</div>
                    <div className="v">{formatDateTime(inspectorOrder.created_at)}</div>
                  </div>
                </div>

                <div className="admin-drawer-section">
                  <h6><i className="fas fa-user me-2 text-info"></i>Khách hàng</h6>
                  <div className="admin-kv">
                    <div className="k">Tên</div>
                    <div className="v">{inspectorOrder.customer_name || '—'}</div>
                    <div className="k">SĐT</div>
                    <div className="v" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="font-monospace">{inspectorOrder.phone || '—'}</span>
                      {!!String(inspectorOrder.phone || '').trim() && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => window.KTM.clipboard.writeText(String(inspectorOrder.phone || '').trim())}
                          title="Copy SĐT"
                        >
                          <i className="fas fa-copy"></i>
                        </button>
                      )}
                    </div>
                    <div className="k">Địa chỉ</div>
                    <div className="v">{inspectorOrder.address || '—'}</div>
                  </div>
                  {(inspectorOrder?.note || '').trim() && (
                    <div className="mt-2 text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      <span className="fw-semibold">Ghi chú:</span> {(inspectorOrder.note || '').trim()}
                    </div>
                  )}
                </div>

                <div className="admin-drawer-section">
                  <h6><i className="fas fa-boxes-stacked me-2 text-primary"></i>Sản phẩm</h6>
                  {(() => {
                    const rows = getOrderItemRows(inspectorOrder);
                    if (!rows.length) {
                      return (
                        <div className="fw-semibold" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {getOrderProductSummary(inspectorOrder) || '—'}
                        </div>
                      );
                    }
                    return (
                      <div className="d-grid gap-2">
                        {rows.map((r, idx) => (
                          <div key={idx} className="d-flex justify-content-between gap-2">
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="fw-semibold" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                <span className="text-muted me-1">{idx + 1}.</span>{r.name}
                              </div>
                              {r.variant ? <div className="text-muted small">{r.variant}</div> : null}
                            </div>
                            <div className="text-muted small text-end text-nowrap" style={{ flexShrink: 0 }}>
                              x{r.qty}{Number(r.unitPrice) > 0 ? ` • ${formatVND(r.unitPrice)}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {(getOrderAdjustmentMoney(inspectorOrder) !== 0 || getOrderAdjustmentSummaryText(inspectorOrder)) && (
                    <div className="mt-2" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      <span className="text-muted">Điều chỉnh:</span>{' '}
                      <span className="fw-semibold">{formatVND(getOrderAdjustmentMoney(inspectorOrder))}</span>
                      {getOrderAdjustmentSummaryText(inspectorOrder) ? (
                        <span className="text-muted">{' '}({getOrderAdjustmentSummaryText(inspectorOrder)})</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            )}
          </AdminDrawer>

          {/* Order create/edit modal */}
          {showModal && (
            <div className="modal show d-block order-modal" style={{ background: 'rgba(0,0,0,0.6)' }} role="dialog" aria-modal="true">
              <div className="modal-dialog modal-dialog-scrollable">
                <div className="modal-content" style={{ borderRadius: 16 }}>
                  <div className="modal-header" style={{ background: 'linear-gradient(135deg, #ffc107, #ffca2c)', border: 'none', borderRadius: '16px 16px 0 0' }}>
                    <h5 className="modal-title fw-bold text-dark mb-0">
                      <i className="fas fa-receipt me-2"></i>
                      {editingId ? 'Sửa đơn hàng' : 'Tạo đơn hàng'}
                    </h5>
                    <button type="button" className="btn-close" onClick={closeModal}></button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveOrder({ mode: 'close' });
                    }}
                  >
                    <div className="modal-body" ref={orderModalBodyRef}>
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label fw-semibold small text-muted mb-1">Tên khách hàng *</label>
                          <input
                            className="form-control"
                            value={form.customer_name}
                            onChange={e => setForm({ ...form, customer_name: e.target.value })}
                            placeholder="Nhập tên khách hàng"
                            required
                            style={{ borderRadius: 10, padding: 12 }}
                          />
                          {!!orderFieldIssues.nameError && (
                            <div className="form-text text-danger">{orderFieldIssues.nameError}</div>
                          )}
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small text-muted mb-1">Số điện thoại *</label>
                          <input
                            className="form-control"
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9+\s-]*"
                            id="order-phone-input"
                            value={form.phone}
                            onChange={e => handlePhoneChange(e.target.value)}
                            onBlur={handlePhoneBlur}
                            placeholder="Nhập số điện thoại"
                            required
                            style={{ borderRadius: 10, padding: 12 }}
                          />
                          {!!orderFieldIssues.phoneError && (
                            <div className="form-text text-danger">{orderFieldIssues.phoneError}</div>
                          )}

                          {!orderFieldIssues.phoneError && phoneMonthHistory.count > 0 && (
                            <div className="form-text text-warning d-flex align-items-center justify-content-between gap-2">
                              <span>
                                Khách này đã có {phoneMonthHistory.count} đơn trong tháng {phoneMonthHistory.monthKey}.
                              </span>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => setShowPhoneHistory((v) => !v)}
                              >
                                {showPhoneHistory ? 'Ẩn lịch sử' : 'Xem lịch sử'}
                              </button>
                            </div>
                          )}

                          {showPhoneHistory && phoneMonthHistory.orders.length > 0 && (
                            <div className="mt-2 border rounded-3 p-2" style={{ background: '#fff' }}>
                              <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                                <div className="small fw-semibold">Lịch sử đơn (cùng tháng)</div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => setShowPhoneHistory(false)}
                                >
                                  Ẩn
                                </button>
                              </div>
                              <div className="d-grid gap-2">
                                {phoneMonthHistory.orders.slice(0, 5).map((o) => (
                                  <div key={o.id} className="d-flex align-items-start justify-content-between gap-2">
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div className="small fw-semibold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        #{o.id} • <span className={`badge ${getStatusBadgeClass(o.status)}`}>{getStatusLabel(o.status)}</span>
                                      </div>
                                      <div className="text-muted small">{formatDateTime(o.created_at)} • {formatVND(getOrderTotalMoney(o))}</div>
                                      <div className="text-muted small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {getOrderProductSummary(o)}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() => {
                                        if (!confirm(`Mở đơn #${o.id}? Dữ liệu đang nhập sẽ mất.`)) return;
                                        editOrder(o);
                                      }}
                                    >
                                      Mở
                                    </button>
                                  </div>
                                ))}
                              </div>
                              {phoneMonthHistory.orders.length > 5 && (
                                <div className="text-muted small mt-2">Chỉ hiển thị 5 đơn gần nhất.</div>
                              )}
                            </div>
                          )}

                          {customerLookup?.status === 'loading' && (
                            <div className="form-text">Đang tìm khách theo SĐT...</div>
                          )}
                          {customerLookup?.status === 'found' && (
                            <div className="form-text text-success">Đã có khách, tự động điền thông tin.</div>
                          )}
                          {customerLookup?.status === 'not-found' && (
                            <div className="form-text text-muted">Chưa có khách, sẽ tạo mới khi lưu đơn.</div>
                          )}
                          {customerLookup?.status === 'error' && (
                            <div className="form-text text-danger">Không tra được khách (lỗi mạng/server).</div>
                          )}
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small text-muted mb-1">Trạng thái</label>
                          <select
                            className="form-select"
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value })}
                            style={{ borderRadius: 10, padding: 12 }}
                          >
                            <option value="draft">Đơn nháp</option>
                            <option value="pending">Chờ xử lý</option>
                            <option value="processing">Đang vận chuyển</option>
                            <option value="done">Hoàn thành</option>
                            <option value="paid">Đã nhận tiền</option>
                            <option value="canceled">Hủy đơn</option>
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-semibold small text-muted mb-1">Địa chỉ</label>
                          <input
                            className="form-control"
                            value={form.address}
                            onChange={e => setForm({ ...form, address: e.target.value })}
                            placeholder="Nhập địa chỉ (không bắt buộc)"
                            style={{ borderRadius: 10, padding: 12 }}
                          />
                          {!!orderFieldIssues.addressWarn && (
                            <div className="form-text text-warning">{orderFieldIssues.addressWarn}</div>
                          )}
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold small text-muted mb-1">Ghi chú đơn hàng</label>
                          <textarea
                            className="form-control"
                            value={form.note}
                            onChange={e => setForm({ ...form, note: e.target.value })}
                            placeholder="Ví dụ: Giao giờ hành chính / Gọi trước khi giao..."
                            rows={2}
                            style={{ borderRadius: 10, padding: 12, resize: 'vertical' }}
                          />
                        </div>

                        <div className="col-12">
                          <div className="d-flex align-items-center justify-content-between">
                            <label className="form-label fw-semibold small text-muted mb-1">Điều chỉnh giá (thêm/bớt)</label>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  adjustment_items: [
                                    ...(Array.isArray(prev.adjustment_items) ? prev.adjustment_items : [{ amount: '', note: '' }]),
                                    { amount: '', note: '' },
                                  ],
                                }));
                              }}
                            >
                              <i className="fas fa-plus me-2"></i>Thêm điều chỉnh
                            </button>
                          </div>

                          <div className="d-grid gap-2">
                            {normalizeAdjustmentFormItems(form.adjustment_items).map((adj, idx) => (
                              <div key={idx} className="row g-2 align-items-end">
                                <div className="col-12 col-md-3">
                                  <label className="form-label small text-muted mb-1">Số tiền</label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    className="form-control"
                                    value={adj.amount}
                                    onChange={(e) => {
                                      const nextAmount = e.target.value;
                                      setForm((prev) => {
                                        const arr = normalizeAdjustmentFormItems(prev.adjustment_items);
                                        arr[idx] = { ...arr[idx], amount: nextAmount };
                                        return { ...prev, adjustment_items: arr };
                                      });
                                    }}
                                    placeholder="+500000 hoặc -200000"
                                    style={{ borderRadius: 10, padding: 12 }}
                                  />
                                </div>
                                <div className="col-12 col-md-8">
                                  <label className="form-label small text-muted mb-1">Ghi chú</label>
                                  <input
                                    className="form-control"
                                    value={adj.note}
                                    onChange={(e) => {
                                      const nextNote = e.target.value;
                                      setForm((prev) => {
                                        const arr = normalizeAdjustmentFormItems(prev.adjustment_items);
                                        arr[idx] = { ...arr[idx], note: nextNote };
                                        return { ...prev, adjustment_items: arr };
                                      });
                                    }}
                                    placeholder="Ví dụ: thêm van 1 tay / giảm giá..."
                                    style={{ borderRadius: 10, padding: 12 }}
                                  />
                                </div>
                                <div className="col-12 col-md-1 d-flex">
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger w-100"
                                    onClick={() => {
                                      setForm((prev) => {
                                        const arr = normalizeAdjustmentFormItems(prev.adjustment_items);
                                        arr.splice(idx, 1);
                                        return { ...prev, adjustment_items: arr.length ? arr : [{ amount: '', note: '' }] };
                                      });
                                    }}
                                    disabled={saving || normalizeAdjustmentFormItems(form.adjustment_items).length <= 1}
                                    title="Xóa điều chỉnh"
                                    style={{ borderRadius: 10, padding: 12 }}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="form-text">Âm = giảm giá, dương = cộng thêm.</div>
                          {!!orderFieldIssues.adjustmentAbnormalWarn && (
                            <div className="form-text text-warning">{orderFieldIssues.adjustmentAbnormalWarn}</div>
                          )}
                          {!!orderFieldIssues.adjustmentNoteWarn && (
                            <div className="form-text text-warning">{orderFieldIssues.adjustmentNoteWarn}</div>
                          )}
                        </div>
                        <div className="col-12 col-md-8">
                          <div className="d-flex align-items-center justify-content-between">
                            <label className="form-label fw-semibold small text-muted mb-1">Sản phẩm *</label>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  items: [...(Array.isArray(prev.items) ? prev.items : []), { product_id: "", quantity: 1, unit_price: null, variant: '', variant_json: null }],
                                }));
                                setItemSearches((prev) => [...(Array.isArray(prev) ? prev : []), '']);
                                if (editingId) {
                                  setSplitDeliverNow((prev) => [...(Array.isArray(prev) ? prev : []), true]);
                                }
                              }}
                              disabled={saving}
                            >
                              <i className="fas fa-plus me-2"></i>Thêm sản phẩm
                            </button>
                          </div>

                          <div className="d-grid gap-2">
                            {(Array.isArray(form.items) ? form.items : [{ product_id: "", quantity: 1 }]).map((it, idx) => (
                              <div key={idx} className="row g-2 align-items-end">
                                <div className="col-12 col-md-8">
                                  <div
                                    className="dropdown w-100"
                                    ref={(el) => {
                                      productDropdownRefs.current[idx] = el;
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className="form-control text-start d-flex align-items-center justify-content-between"
                                      style={{ borderRadius: 10, padding: 12 }}
                                      onClick={() => {
                                        setOpenProductDropdownIdx((prev) => (prev === idx ? null : idx));
                                        setTimeout(() => {
                                          const input = document.getElementById(`order-product-search-${idx}`);
                                          if (input) input.focus();
                                        }, 0);
                                      }}
                                    >
                                      <span className={it.product_id ? '' : 'text-muted'} style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {getProductLabel(it.product_id)}
                                      </span>
                                      <i className="fas fa-chevron-down text-muted" style={{ marginLeft: 8, flexShrink: 0 }}></i>
                                    </button>

                                    {openProductDropdownIdx === idx && (
                                      <div
                                        className="dropdown-menu show w-100 p-2"
                                        style={{ maxHeight: 320, overflowY: 'auto' }}
                                      >
                                        <input
                                          id={`order-product-search-${idx}`}
                                          className="form-control"
                                          value={itemSearches[idx] || ''}
                                          onChange={(e) => {
                                            const next = e.target.value;
                                            setItemSearches((prev) => {
                                              const arr = Array.isArray(prev) ? [...prev] : [];
                                              arr[idx] = next;
                                              return arr;
                                            });
                                          }}
                                          placeholder="Tìm theo tên / mã..."
                                          style={{ borderRadius: 10, padding: 10 }}
                                        />
                                        <div className="mt-2" />
                                        {(() => {
                                          const filtered = getFilteredProducts(idx);
                                          if (filtered.length === 0) {
                                            return <div className="text-muted small px-2 py-1">Không có sản phẩm phù hợp</div>;
                                          }
                                          return filtered.map((p) => (
                                            <button
                                              key={p.id}
                                              type="button"
                                              className="dropdown-item"
                                              onClick={() => {
                                                const next = String(p.id);
                                                const groups = normalizeVariantGroups(p?.variants);
                                                const selections = {};
                                                for (const g of groups) {
                                                  const groupName = String(g?.name || '').trim();
                                                  const first = Array.isArray(g?.options) ? g.options[0] : null;
                                                  const firstLabel = String(first?.label || '').trim();
                                                  if (groupName && firstLabel) selections[groupName] = firstLabel;
                                                }
                                                const variantText = buildVariantTextFromSelections(selections);
                                                const unitPrice = computeUnitPriceForProductAndSelections(p, selections);
                                                setForm((prev) => {
                                                  const items = Array.isArray(prev.items) ? [...prev.items] : [];
                                                  items[idx] = {
                                                    ...(items[idx] || { quantity: 1 }),
                                                    product_id: next,
                                                    variant_json: Object.keys(selections).length ? selections : null,
                                                    variant: variantText,
                                                    unit_price: groups.length ? unitPrice : null,
                                                  };
                                                  return { ...prev, items };
                                                });
                                                setOpenProductDropdownIdx(null);
                                              }}
                                            >
                                              {p.name}{p.code ? ` (${p.code})` : ''}
                                            </button>
                                          ));
                                        })()}
                                      </div>
                                    )}

                                    {/* Keep native required validation */}
                                    <select
                                      className="form-select"
                                      value={it.product_id}
                                      onChange={() => {}}
                                      required
                                      style={{ position: 'absolute', opacity: 0, height: 0, pointerEvents: 'none' }}
                                      tabIndex={-1}
                                      aria-hidden="true"
                                    >
                                      <option value="">-- chọn sản phẩm --</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {(() => {
                                    const issue = orderFieldIssues.items?.[idx];
                                    if (!issue) return null;
                                    return (
                                      <>
                                        {!!issue.productError && <div className="form-text text-danger">{issue.productError}</div>}
                                        {!!issue.dupWarn && <div className="form-text text-warning">{issue.dupWarn}</div>}
                                      </>
                                    );
                                  })()}

                                  {(() => {
                                    if (!it?.product_id) return null;
                                    const p = getProductById(it.product_id);
                                    const groups = normalizeVariantGroups(p?.variants);
                                    if (!groups.length) return null;

                                    const selections = (it?.variant_json && typeof it.variant_json === 'object') ? it.variant_json : {};

                                    return (
                                      <div className="mt-2 d-grid gap-2">
                                        {groups.map((g, gi) => {
                                          const groupName = String(g?.name || `Biến thể ${gi + 1}`).trim();
                                          const selected = String(selections?.[groupName] || '').trim();
                                          return (
                                            <div key={groupName}>
                                              <label className="form-label small text-muted mb-1">{groupName}</label>
                                              <select
                                                className="form-select"
                                                value={selected}
                                                onChange={(e) => {
                                                  const nextLabel = String(e.target.value || '').trim();
                                                  setForm((prev) => {
                                                    const items = Array.isArray(prev.items) ? [...prev.items] : [];
                                                    const cur = { ...(items[idx] || {}) };
                                                    const p = getProductById(cur.product_id);
                                                    const groups = normalizeVariantGroups(p?.variants);
                                                    const nextSelections = (cur?.variant_json && typeof cur.variant_json === 'object') ? { ...cur.variant_json } : {};
                                                    if (nextLabel) nextSelections[groupName] = nextLabel;
                                                    else delete nextSelections[groupName];
                                                    const variantText = buildVariantTextFromSelections(nextSelections);
                                                    const unitPrice = computeUnitPriceForProductAndSelections(p, nextSelections);
                                                    items[idx] = {
                                                      ...cur,
                                                      variant_json: Object.keys(nextSelections).length ? nextSelections : null,
                                                      variant: variantText,
                                                      unit_price: unitPrice,
                                                    };
                                                    return { ...prev, items };
                                                  });
                                                }}
                                                style={{ borderRadius: 10, padding: 12 }}
                                              >
                                                <option value="">-- chọn {groupName} --</option>
                                                {(Array.isArray(g?.options) ? g.options : []).map((opt) => (
                                                  <option key={opt.label} value={opt.label}>
                                                    {opt.label}{Number.isFinite(Number(opt?.price)) ? ` (${formatVND(Number(opt.price))})` : (Number(opt?.price_delta) ? ` (${opt.price_delta > 0 ? '+' : ''}${opt.price_delta})` : '')}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}

                                  {editingId && (
                                    <div className="form-check mt-1">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`order-split-deliver-${idx}`}
                                        checked={!!splitDeliverNow[idx]}
                                        onChange={(e) => {
                                          const checked = !!e.target.checked;
                                          setSplitDeliverNow((prev) => {
                                            const arr = Array.isArray(prev) ? [...prev] : [];
                                            const targetLen = Array.isArray(form.items) ? form.items.length : 0;
                                            while (arr.length < targetLen) arr.push(true);
                                            arr[idx] = checked;
                                            return arr;
                                          });
                                        }}
                                        disabled={saving || splitting}
                                      />
                                      <label className="form-check-label small text-muted" htmlFor={`order-split-deliver-${idx}`}>
                                        Giao đợt 1
                                      </label>
                                    </div>
                                  )}
                                </div>
                                <div className="col-8 col-md-3">
                                  <input
                                    type="number"
                                    className="form-control"
                                    value={it.quantity}
                                    onChange={(e) => {
                                      const nextQty = e.target.value;
                                      setForm((prev) => {
                                        const items = Array.isArray(prev.items) ? [...prev.items] : [];
                                        items[idx] = { ...(items[idx] || { product_id: "" }), quantity: nextQty };
                                        return { ...prev, items };
                                      });
                                    }}
                                    min="1"
                                    style={{ borderRadius: 10, padding: 12 }}
                                  />
                                  {(() => {
                                    const issue = orderFieldIssues.items?.[idx];
                                    if (!issue) return null;
                                    return !!issue.qtyError ? (
                                      <div className="form-text text-danger">{issue.qtyError}</div>
                                    ) : null;
                                  })()}
                                </div>
                                <div className="col-4 col-md-1 d-flex justify-content-end">
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => {
                                      setForm((prev) => {
                                        const items = Array.isArray(prev.items) ? [...prev.items] : [];
                                        items.splice(idx, 1);
                                        return { ...prev, items: items.length ? items : [{ product_id: "", quantity: 1, unit_price: null, variant: '', variant_json: null }] };
                                      });
                                      setItemSearches((prev) => {
                                        const arr = Array.isArray(prev) ? [...prev] : [];
                                        arr.splice(idx, 1);
                                        return arr.length ? arr : [''];
                                      });
                                      setSplitDeliverNow((prev) => {
                                        const arr = Array.isArray(prev) ? [...prev] : [];
                                        arr.splice(idx, 1);
                                        return arr;
                                      });
                                      setOpenProductDropdownIdx((prev) => {
                                        if (prev == null) return prev;
                                        if (prev === idx) return null;
                                        if (prev > idx) return prev - 1;
                                        return prev;
                                      });
                                    }}
                                    disabled={saving || splitting || (Array.isArray(form.items) ? form.items.length : 1) <= 1}
                                    title="Xóa sản phẩm"
                                    style={{ borderRadius: 10, padding: 10 }}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {(() => {
                          const items = Array.isArray(form.items) ? form.items : [];
                          const normalizedItems = items.filter(it => it?.product_id);
                          const subtotal = getItemsSubtotal(normalizedItems);
                          const shipInfo = getOrderShipInfo(normalizedItems);
                          const adjDerived = getAdjustmentDerivedFromForm(form);
                          const adj = adjDerived.amount;
                          const total = subtotal + (shipInfo.found ? shipInfo.fee : 0) + adj;

                          return (
                            <div className="col-12">
                              <div className="d-flex flex-column gap-1 small bg-light rounded-3 p-3">
                                <div className="d-flex justify-content-between">
                                  <span className="text-muted">Tạm tính</span>
                                  <span className="fw-semibold">{formatVND(subtotal)}</span>
                                </div>
                                {shipInfo.found && (
                                  <div className="d-flex justify-content-between">
                                    <span className="text-muted">Ship</span>
                                    <span className="fw-semibold">{formatVND(shipInfo.fee)}</span>
                                  </div>
                                )}
                                {!!orderFieldIssues.shipAbnormalWarn && (
                                  <div className="text-warning">{orderFieldIssues.shipAbnormalWarn}</div>
                                )}
                                {adj !== 0 && (
                                  <div className="d-flex justify-content-between">
                                    <span className="text-muted">Điều chỉnh</span>
                                    <span className="fw-semibold">{formatVND(adj)}</span>
                                  </div>
                                )}
                                {(form.note || '').trim() && (
                                  <div className="text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                    Ghi chú đơn: {(form.note || '').trim()}
                                  </div>
                                )}
                                {!!adjDerived.summaryText && (
                                  <div className="text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                    Ghi chú điều chỉnh: {adjDerived.summaryText}
                                  </div>
                                )}
                                <div className="d-flex justify-content-between pt-1 border-top">
                                  <span className="text-muted">Tổng</span>
                                  <span className="fw-bold">{formatVND(total)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="modal-footer" style={{ border: 'none' }}>
                      <button type="button" className="btn btn-light" onClick={closeModal} disabled={saving || splitting} style={{ borderRadius: 10 }}>
                        Hủy
                      </button>

                      {!!editingId && (
                        <button
                          type="button"
                          className="btn btn-outline-primary fw-semibold"
                          onClick={splitOrderDeliverNow}
                          disabled={saving || splitting}
                          style={{ borderRadius: 10 }}
                          title="Chọn sản phẩm giao đợt 1 và tách phần còn lại sang đơn chờ hàng"
                        >
                          {splitting ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span>Đang tách...</>
                          ) : (
                            <><i className="fas fa-random me-2"></i>Tách đơn giao ngay</>
                          )}
                        </button>
                      )}

                      {!editingId && (
                        <button
                          type="button"
                          className="btn btn-outline-warning fw-semibold"
                          onClick={() => saveOrder({ mode: 'new' })}
                          disabled={saving || !orderFieldIssues.canSubmit}
                          style={{ borderRadius: 10 }}
                          title="Lưu xong giữ form để tạo đơn mới"
                        >
                          <i className="fas fa-plus me-2"></i>Lưu &amp; tạo đơn mới
                        </button>
                      )}

                      <button type="submit" className="btn btn-warning fw-semibold" disabled={saving || splitting || !orderFieldIssues.canSubmit} style={{ borderRadius: 10, boxShadow: '0 4px 12px rgba(255,193,7,0.3)' }}>
                        {saving ? (
                          <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</>
                        ) : (
                          <><i className="fas fa-check me-2"></i>Lưu</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
