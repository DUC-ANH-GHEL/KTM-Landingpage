    // ==================== MAIN APP ====================
    function AdminApp() {
      const [isLoggedIn, setIsLoggedIn] = useState(false);
      const [loginError, setLoginError] = useState('');
      const [currentUser, setCurrentUser] = useState(null);
      const [activeMenu, setActiveMenu] = useState('search');
      const [pinnedMenus, setPinnedMenus] = useState(() => loadAdminPins());
      const [recentMenus, setRecentMenus] = useState(() => loadAdminRecent());
      const [orderAutoOpenCreateToken, setOrderAutoOpenCreateToken] = useState(null);
      const [orderAutoOpenCreateProductId, setOrderAutoOpenCreateProductId] = useState('');
      const [albums, setAlbums] = useState([]);
      const [selectedAlbum, setSelectedAlbum] = useState(null);
      const [showAlbumModal, setShowAlbumModal] = useState(false);
      const [editingAlbum, setEditingAlbum] = useState(null);
      const [loading, setLoading] = useState(true);
      const [toasts, setToasts] = useState([]);

      // Album inspector drawer states
      const [albumInspectorOpen, setAlbumInspectorOpen] = useState(false);
      const [albumInspectorItem, setAlbumInspectorItem] = useState(null);
      const [albumInspectorEditMode, setAlbumInspectorEditMode] = useState(false);
      const [albumInspectorLoading, setAlbumInspectorLoading] = useState(false);
      const [albumInspectorError, setAlbumInspectorError] = useState('');

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
        // Provide a shared sticky offset for tables/headers.
        const apply = () => {
          try {
            const el = document.querySelector('.admin-topbar');
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const h = Math.max(0, Math.round(rect.height));
            // Add a small gap so sticky headers don't touch topbar.
            document.documentElement.style.setProperty('--ktm-admin-sticky-top', `${h + 10}px`);
          } catch {
            // ignore
          }
        };

        apply();
        window.addEventListener('resize', apply);
        const t = setTimeout(apply, 0);
        return () => {
          clearTimeout(t);
          window.removeEventListener('resize', apply);
        };
      }, [isLoggedIn, activeMenu]);

      useEffect(() => {
        // Keep bottom-fixed UI above iOS Safari dynamic browser UI.
        const vv = window.visualViewport;

        const apply = () => {
          try {
            const innerH = Number(window.innerHeight) || 0;
            const vvH = Number(vv?.height) || innerH;
            const vvTop = Number(vv?.offsetTop) || 0;
            const insetBottom = Math.max(0, Math.round(innerH - vvH - vvTop));
            document.documentElement.style.setProperty('--ktm-visual-inset-bottom', `${insetBottom}px`);
          } catch {
            // ignore
          }
        };

        apply();
        window.addEventListener('resize', apply);
        try {
          vv?.addEventListener?.('resize', apply);
          vv?.addEventListener?.('scroll', apply);
        } catch {
          // ignore
        }

        return () => {
          window.removeEventListener('resize', apply);
          try {
            vv?.removeEventListener?.('resize', apply);
            vv?.removeEventListener?.('scroll', apply);
          } catch {
            // ignore
          }
        };
      }, []);

      useEffect(() => {
        if (!isLoggedIn) return;

        const isEditableTarget = (target) => {
          if (!target) return false;
          const tag = String(target.tagName || '').toLowerCase();
          if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
          if (target.isContentEditable) return true;
          return false;
        };

        const onKeyDown = (e) => {
          if (!e) return;
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (isEditableTarget(e.target)) return;

          const key = e.key;
          if (key === '/' || key === 'N' || key === 'n' || key === 'Escape' || key === 'j' || key === 'J' || key === 'k' || key === 'K') {
            // Prevent browser search for '/' in some contexts.
            if (key === '/') e.preventDefault();
            window.dispatchEvent(new CustomEvent('ktm-admin-hotkey', { detail: { key } }));
          }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
      }, [isLoggedIn]);

      useEffect(() => {
        if (!isLoggedIn) return;
        // Ensure current menu appears in recent
        setRecentMenus((prev) => {
          const ids = Array.isArray(prev) ? prev : [];
          const next = [activeMenu, ...ids.filter((x) => x !== activeMenu)].slice(0, 8);
          saveAdminRecent(next);
          return next;
        });
      }, [isLoggedIn]);

      const trackRecentMenu = (menuId) => {
        const id = String(menuId || '').trim();
        if (!id) return;
        setRecentMenus((prev) => {
          const ids = Array.isArray(prev) ? prev : [];
          const next = [id, ...ids.filter((x) => x !== id)].slice(0, 8);
          saveAdminRecent(next);
          return next;
        });
      };

      const togglePinnedMenu = (menuId) => {
        const id = String(menuId || '').trim();
        if (!id) return;
        setPinnedMenus((prev) => {
          const ids = Array.isArray(prev) ? prev : [];
          const exists = ids.includes(id);
          const next = exists ? ids.filter((x) => x !== id) : [id, ...ids].slice(0, 10);
          saveAdminPins(next);
          return next;
        });
      };

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

      const showToast = (message, type = 'success', options = null) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);

        // Back-compat: allow calling showToast({ message, type, ... })
        if (message && typeof message === 'object') {
          const obj = message;
          setToasts((prev) => ([
            ...prev,
            {
              id,
              message: String(obj.message || ''),
              type: String(obj.type || type || 'success'),
              actionLabel: obj.actionLabel || null,
              onAction: typeof obj.onAction === 'function' ? obj.onAction : null,
              durationMs: obj.durationMs || null,
            }
          ]));
          return;
        }

        const opt = options && typeof options === 'object' ? options : null;
        setToasts((prev) => ([
          ...prev,
          {
            id,
            message: String(message || ''),
            type: String(type || 'success'),
            actionLabel: opt?.actionLabel || null,
            onAction: typeof opt?.onAction === 'function' ? opt.onAction : null,
            durationMs: opt?.durationMs || null,
          }
        ]));
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
        openAlbumInspector(album);
        setAlbumInspectorEditMode(true);
      };

      const handleSaveAlbum = async (formData, origin = 'modal') => {
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

          if (origin === 'drawer') {
            // Keep drawer open, exit edit mode, refresh data
            setAlbumInspectorEditMode(false);
            setEditingAlbum(null);
            loadAlbums(currentAlbumFolder?.uuid);
            // Refresh inspector item
            if (isEditing && albumInspectorItem) {
              setAlbumInspectorItem({...albumInspectorItem, ...formData});
            }
          } else {
            // Modal: close modal
            setShowAlbumModal(false);
            setEditingAlbum(null);
            loadAlbums(currentAlbumFolder?.uuid);
          }
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

      const openAlbumInspector = async (album) => {
        if (!album) return;
        setAlbumInspectorOpen(true);
        setAlbumInspectorError('');
        setAlbumInspectorLoading(false);
        setAlbumInspectorEditMode(false);
        setAlbumInspectorItem(album);
      };

      const closeAlbumInspector = () => {
        setAlbumInspectorOpen(false);
        setAlbumInspectorLoading(false);
        setAlbumInspectorError('');
        setAlbumInspectorEditMode(false);
        setAlbumInspectorItem(null);
      };

      const editAlbumInspector = (album) => {
        setAlbumInspectorEditMode(true);
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
        const swipeStartRef = useRef(null);