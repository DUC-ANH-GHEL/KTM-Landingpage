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
        const statsRootRef = useRef(null);
        const [swipeDx, setSwipeDx] = useState(0);
        const [swipeAnimating, setSwipeAnimating] = useState(false);
        const swipeLimitToastAtRef = useRef(0);

        // Debt reconciliation (Excel)
        const [reconRunning, setReconRunning] = useState(false);
        const [reconError, setReconError] = useState('');
        const [reconProgress, setReconProgress] = useState('');
        const [reconFileName, setReconFileName] = useState('');
        const [reconResult, setReconResult] = useState(null);
        const productsByIdRef = useRef(new Map());
        const [xlsxStatus, setXlsxStatus] = useState(window?.XLSX ? 'ready' : 'loading');
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

        const shiftMonthKey = (key, delta) => {
          const s = String(key || '').trim();
          const m = s.match(/^(\d{4})-(\d{2})$/);
          if (!m) return s;
          const year = Number(m[1]);
          const monthIndex = Number(m[2]) - 1;
          const d = new Date(year, monthIndex, 1);
          d.setMonth(d.getMonth() + Number(delta || 0));
          const y = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          return `${y}-${mm}`;
        };

        // Month bounds: block future, allow past up to 5 months
        const maxMonthKey = getCurrentMonth();
        const minMonthKey = shiftMonthKey(maxMonthKey, -5);
        const isMonthInRange = (k) => {
          const key = String(k || '').trim();
          if (!key) return false;
          return key >= minMonthKey && key <= maxMonthKey;
        };
        const clampMonthInRange = (k) => {
          const key = String(k || '').trim();
          if (!key) return key;
          if (key < minMonthKey) return minMonthKey;
          if (key > maxMonthKey) return maxMonthKey;
          return key;
        };
        const maybeToastMonthLimit = (type) => {
          const now = Date.now();
          if (now - Number(swipeLimitToastAtRef.current || 0) < 1200) return;
          swipeLimitToastAtRef.current = now;
          if (type === 'future') showToast('Không xem được tháng tương lai', 'warning');
          else showToast('Chỉ xem tối đa 5 tháng gần nhất', 'warning');
        };

        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const getSwipeWidth = () => Math.max(320, Number(statsRootRef.current?.clientWidth) || 360);
        const getSwipeMax = () => {
          const w = getSwipeWidth();
          return clamp(Math.floor(w * 0.35), 110, 180);
        };
        const getNavThreshold = () => {
          const w = getSwipeWidth();
          return clamp(Math.floor(w * 0.22), 70, 140);
        };

        useEffect(() => {
          let cancelled = false;

          const hasXlsx = () => Boolean(window?.XLSX && typeof window.XLSX.read === 'function');

          const injectScript = (src) => new Promise((resolve, reject) => {
            try {
              const existing = Array.from(document.querySelectorAll('script')).find((s) => (s?.src || '').includes(src));
              if (existing) {
                // If it's already there, just wait briefly for global.
                const waitStarted = Date.now();
                const wait = setInterval(() => {
                  if (hasXlsx()) {
                    clearInterval(wait);
                    resolve(true);
                  } else if (Date.now() - waitStarted > 2500) {
                    clearInterval(wait);
                    reject(new Error('existing script not loaded'));
                  }
                }, 100);
                return;
              }

              const s = document.createElement('script');
              s.src = src;
              s.async = true;
              s.onload = () => resolve(true);
              s.onerror = () => reject(new Error(`load failed: ${src}`));
              document.head.appendChild(s);
            } catch (e) {
              reject(e);
            }
          });

          const tryLoadXlsxFallback = async () => {
            if (hasXlsx()) return true;
            const sources = [
              'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
              'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
              'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
            ];

            for (const src of sources) {
              if (hasXlsx()) return true;
              try {
                await injectScript(src);
                if (hasXlsx()) return true;
              } catch {
                // try next source
              }
            }
            return hasXlsx();
          };

          (async () => {
            if (xlsxStatus === 'ready' || xlsxStatus === 'failed') return;
            if (hasXlsx()) {
              if (!cancelled) setXlsxStatus('ready');
              return;
            }

            // Give HTML defer script a moment, then try fallbacks.
            if (!cancelled) setXlsxStatus('loading');
            await new Promise((r) => setTimeout(r, 300));

            const ok = await tryLoadXlsxFallback();
            if (cancelled) return;
            setXlsxStatus(ok ? 'ready' : 'failed');
          })();

          return () => { cancelled = true; };
        }, [xlsxStatus]);

        const normalizeLoose = (value) => {
          const s = String(value ?? '').trim().toLowerCase();
          if (!s) return '';
          try {
            return s
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd')
              .replace(/[^a-z0-9\s\.\-\/\+]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          } catch {
            return s.replace(/\s+/g, ' ').trim();
          }
        };

        const parseExcelDateToMonthKey = (cell) => {
          if (cell == null || cell === '') return '';
          // Excel serial number
          if (typeof cell === 'number' && Number.isFinite(cell) && window?.XLSX?.SSF?.parse_date_code) {
            try {
              const d = window.XLSX.SSF.parse_date_code(cell);
              if (!d || !d.y || !d.m) return '';
              return `${String(d.y).padStart(4, '0')}-${String(d.m).padStart(2, '0')}`;
            } catch {
              // ignore
            }
          }

          const s = String(cell).trim();
          // dd.mm.yyyy or d.m.yyyy
          const m = s.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})$/);
          if (m) {
            const mm = String(Number(m[2]) || 0).padStart(2, '0');
            return `${m[3]}-${mm}`;
          }

          // ISO-ish yyyy-mm-dd
          const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (iso) return `${iso[1]}-${iso[2]}`;

          // Fallback: Date.parse
          const d = new Date(s);
          if (!Number.isNaN(d.getTime())) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          }
          return '';
        };

        const parseExcelMoney = (cell) => {
          if (cell == null || cell === '') return 0;
          if (typeof cell === 'number' && Number.isFinite(cell)) return Math.trunc(cell);
          return window.KTM.money.parseMoney(String(cell));
        };

        const ensureProductsLoaded = async () => {
          const map = productsByIdRef.current;
          if (map && map.size > 0) return map;
          try {
            const data = await window.KTM.api.getJSON(`${API_BASE}/api/products`, 'Lỗi tải sản phẩm');
            const arr = Array.isArray(data?.products) ? data.products : (Array.isArray(data) ? data : []);
            const next = new Map();
            for (const p of arr) {
              const id = String(p?.id ?? '').trim();
              if (!id) continue;
              next.set(id, p);
            }
            productsByIdRef.current = next;
            return next;
          } catch {
            productsByIdRef.current = new Map();
            return productsByIdRef.current;
          }
        };

        const getProductByIdForRecon = (pid) => {
          const id = String(pid ?? '').trim();
          if (!id) return null;
          return productsByIdRef.current?.get(id) || null;
        };

        const parseExcelFileRows = async (file) => {
          if (!file) throw new Error('Chưa chọn file');
          if (!window?.XLSX?.read) {
            throw new Error('Thiếu thư viện đọc Excel (XLSX). Vui lòng tải lại trang admin.');
          }

          const buf = await file.arrayBuffer();
          const wb = window.XLSX.read(buf, { type: 'array' });
          const sheetName = wb?.SheetNames?.[0];
          const ws = sheetName ? wb.Sheets[sheetName] : null;
          if (!ws) throw new Error('Không đọc được sheet trong file');

          const grid = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
          const rows = Array.isArray(grid) ? grid : [];
          if (!rows.length) throw new Error('File rỗng');

          const want = {
            product: ['ten san pham', 'tensanpham', 'san pham', 'tên sản phẩm'],
            cod: ['tong tien thu ho', 'tổng tiền thu hộ', 'thu ho', 'thu hộ', 'tong thu ho', 'tổng thu hộ'],
            date: ['ngay', 'ngày', 'date'],
          };

          const findHeaderRow = () => {
            const maxScan = Math.min(30, rows.length);
            for (let r = 0; r < maxScan; r++) {
              const row = Array.isArray(rows[r]) ? rows[r] : [];
              const normalized = row.map((c) => normalizeLoose(c));
              const findCol = (aliases) => {
                for (let i = 0; i < normalized.length; i++) {
                  const v = normalized[i];
                  if (!v) continue;
                  if (aliases.some((a) => v.includes(normalizeLoose(a)))) return i;
                }
                return -1;
              };

              const productCol = findCol(want.product);
              const codCol = findCol(want.cod);
              if (productCol >= 0 && codCol >= 0) {
                const dateCol = findCol(want.date);
                return { headerRow: r, productCol, codCol, dateCol };
              }
            }
            return null;
          };

          const hdr = findHeaderRow();
          if (!hdr) throw new Error('Không tìm thấy header cột "Tên sản phẩm" và "Tổng tiền thu hộ"');

          const out = [];
          const monthKeys = new Set();
          for (let r = hdr.headerRow + 1; r < rows.length; r++) {
            const row = Array.isArray(rows[r]) ? rows[r] : [];
            const product = String(row[hdr.productCol] ?? '').trim();
            const cod = parseExcelMoney(row[hdr.codCol]);
            if (!product && !cod) continue;

            // Ignore summary/footer rows
            const productN = normalizeLoose(product);
            if (!productN) continue;
            if (productN.includes('tong tien') || productN.includes('tong') || productN.includes('thanh toan') || productN.includes('thanh toán')) {
              continue;
            }

            const rawDate = hdr.dateCol >= 0 ? row[hdr.dateCol] : '';
            const mk = rawDate ? parseExcelDateToMonthKey(rawDate) : '';
            if (mk) monthKeys.add(mk);

            out.push({
              rowIndex: r + 1,
              dateRaw: rawDate,
              monthKey: mk,
              product,
              productNorm: normalizeLoose(product),
              productCompact: normalizeLoose(product).replace(/\s+/g, ''),
              cod,
            });
          }

          return { rows: out, monthKeys: Array.from(monthKeys.values()).sort() };
        };

        const fetchOrdersForMonth = async (monthKey) => {
          const url = `${API_BASE}/api/orders?month=${encodeURIComponent(monthKey)}&includeItems=1`;
          const data = await window.KTM.api.getJSON(url, 'Lỗi tải danh sách đơn');
          const arr = Array.isArray(data?.orders) ? data.orders : (Array.isArray(data) ? data : []);
          return arr;
        };

        const buildSystemOrderRecords = async (monthKeys) => {
          const keys = Array.isArray(monthKeys) && monthKeys.length ? monthKeys : [month];
          const ordersAll = [];

          for (let i = 0; i < keys.length; i++) {
            const mk = keys[i];
            setReconProgress(`Đang tải đơn hệ thống tháng ${mk} (${i + 1}/${keys.length})...`);
            const list = await fetchOrdersForMonth(mk);
            ordersAll.push(...list);
          }

          const normalizeStatus = (s) => String(s || '').trim().toLowerCase();
          const filtered = ordersAll.filter((o) => {
            const st = normalizeStatus(o?.status);
            return st !== 'draft' && st !== 'canceled';
          });

          const records = filtered.map((o) => {
            const productSummary = window.KTM.orders.getOrderProductSummary(o, getProductByIdForRecon);
            const cod = window.KTM.orders.getOrderTotalMoney(o, getProductByIdForRecon);
            const productNorm = normalizeLoose(productSummary);
            return {
              id: String(o?.id ?? ''),
              created_at: o?.created_at ?? null,
              status: String(o?.status ?? ''),
              productSummary,
              productNorm,
              productCompact: productNorm.replace(/\s+/g, ''),
              cod: Number(cod || 0) || 0,
              raw: o,
            };
          }).filter((r) => r.id && r.cod > 0);

          return records;
        };

        const similarityScore = (aNorm, bNorm) => {
          const a = String(aNorm || '').trim();
          const b = String(bNorm || '').trim();
          if (!a || !b) return 0;
          if (a === b) return 1;
          const aCompact = a.replace(/\s+/g, '');
          const bCompact = b.replace(/\s+/g, '');
          if (aCompact && bCompact && (aCompact === bCompact)) return 1;
          if (aCompact && bCompact && (bCompact.includes(aCompact) || aCompact.includes(bCompact))) return 0.9;

          const toks = a.split(' ').filter(Boolean);
          if (!toks.length) return 0;
          let hit = 0;
          for (const t of toks) {
            if (t.length <= 1) continue;
            if (b.includes(t)) hit += 1;
          }
          const base = hit / Math.max(1, toks.length);
          const lenPenalty = Math.min(0.15, Math.abs(a.length - b.length) / Math.max(1, Math.max(a.length, b.length)));
          return Math.max(0, base - lenPenalty);
        };

        const reconcileExcelAgainstSystem = async (file) => {
          setReconError('');
          setReconResult(null);
          setReconFileName(file?.name || '');
          setReconRunning(true);
          setReconProgress('Đang đọc file Excel...');

          try {
            await ensureProductsLoaded();

            const parsed = await parseExcelFileRows(file);
            const excelRows = parsed.rows;
            const monthKeys = parsed.monthKeys.length ? parsed.monthKeys : [month];

            setReconProgress(`Đọc được ${excelRows.length} dòng. Đang chuẩn bị đối soát...`);

            const sysOrders = await buildSystemOrderRecords(monthKeys);
            setReconProgress(`Đang đối soát (${excelRows.length} dòng Excel vs ${sysOrders.length} đơn hệ thống)...`);

            const moneyMap = new Map();
            for (const o of sysOrders) {
              const key = String(o.cod);
              const arr = moneyMap.get(key) || [];
              arr.push(o);
              moneyMap.set(key, arr);
            }

            const usedOrderIds = new Set();
            const matches = [];
            const excelOnly = [];
            const amountMismatch = [];

            // Pass 1: match by COD, then best product similarity
            for (const row of excelRows) {
              const candidates = (moneyMap.get(String(row.cod)) || []).filter((o) => !usedOrderIds.has(o.id));
              if (!candidates.length) {
                excelOnly.push(row);
                continue;
              }

              let best = null;
              let bestScore = -1;
              for (const o of candidates) {
                const sc = similarityScore(row.productNorm, o.productNorm);
                if (sc > bestScore) {
                  bestScore = sc;
                  best = o;
                }
              }

              if (best && bestScore >= 0.55) {
                usedOrderIds.add(best.id);
                matches.push({
                  row,
                  order: best,
                  score: bestScore,
                });
              } else {
                excelOnly.push(row);
              }
            }

            // Pass 2: for excel-only rows, try to find closest order by product, report amount diff
            const stillExcelOnly = [];
            for (const row of excelOnly) {
              let best = null;
              let bestScore = -1;
              for (const o of sysOrders) {
                const sc = similarityScore(row.productNorm, o.productNorm);
                if (sc > bestScore) {
                  bestScore = sc;
                  best = o;
                }
              }
              if (best && bestScore >= 0.72 && Number(best.cod || 0) !== Number(row.cod || 0)) {
                amountMismatch.push({
                  row,
                  order: best,
                  score: bestScore,
                  diff: Number(row.cod || 0) - Number(best.cod || 0),
                });
              } else {
                stillExcelOnly.push(row);
              }
            }

            const systemOnly = sysOrders.filter((o) => !usedOrderIds.has(o.id));

            const ok = stillExcelOnly.length === 0 && systemOnly.length === 0 && amountMismatch.length === 0;

            setReconResult({
              ok,
              monthKeys,
              excelCount: excelRows.length,
              systemCount: sysOrders.length,
              matches,
              excelOnly: stillExcelOnly,
              systemOnly,
              amountMismatch,
            });
            setReconProgress(ok ? 'OK ✅' : 'Đã đối soát xong');
          } catch (e) {
            setReconError(String(e?.message || e || 'Lỗi đối soát'));
            setReconProgress('');
          } finally {
            setReconRunning(false);
          }
        };

        const handleStatsTouchStart = (e) => {
          try {
            if (!e?.touches || e.touches.length !== 1) return;
            if (swipeAnimating) return;
            const target = e.target;
            if (target && typeof target.closest === 'function') {
              // Avoid hijacking gestures on interactive controls
              const interactive = target.closest('input, textarea, select, button, a, [role="button"], [contenteditable="true"], .dropdown-menu, .modal');
              if (interactive) {
                swipeStartRef.current = null;
                return;
              }
            }
            const t = e.touches[0];
            swipeStartRef.current = { x: t.clientX, y: t.clientY, at: Date.now(), swiping: false };
          } catch {
            swipeStartRef.current = null;
          }
        };

        const handleStatsTouchMove = (e) => {
          const start = swipeStartRef.current;
          if (!start || swipeAnimating) return;
          const t = e?.touches && e.touches[0];
          if (!t) return;

          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          const adx = Math.abs(dx);
          const ady = Math.abs(dy);

          if (!start.swiping) {
            if (adx > 12 && adx > ady * 1.2) {
              start.swiping = true;
              setSwipeAnimating(false);
            } else {
              return;
            }
          }

          const maxDx = getSwipeMax();
          setSwipeDx(clamp(dx, -maxDx, maxDx));
        };

        const handleStatsTouchEnd = (e) => {
          const start = swipeStartRef.current;
          swipeStartRef.current = null;
          if (!start || swipeAnimating || !start.swiping) {
            setSwipeDx(0);
            return;
          }

          const t = e?.changedTouches && e.changedTouches[0];
          if (!t) return;

          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          const dt = Date.now() - start.at;

          const adx = Math.abs(dx);
          const ady = Math.abs(dy);

          // Only handle clear horizontal swipes; keep vertical scroll natural
          if (dt > 1000) return;
          if (adx < 30) {
            setSwipeDx(0);
            return;
          }
          if (adx < ady * 1.5) return;

          const threshold = getNavThreshold();
          const shouldNav = adx >= threshold;
          const sign = dx > 0 ? 1 : -1;

          if (!shouldNav) {
            setSwipeAnimating(true);
            setSwipeDx(0);
            setTimeout(() => setSwipeAnimating(false), 220);
            return;
          }

          const delta = sign > 0 ? -1 : 1;
          const candidate = shiftMonthKey(month, delta);
          if (!isMonthInRange(candidate)) {
            setSwipeAnimating(true);
            setSwipeDx(sign * Math.floor(getSwipeMax() * 0.55));
            setTimeout(() => {
              setSwipeDx(0);
              setTimeout(() => setSwipeAnimating(false), 200);
            }, 140);
            maybeToastMonthLimit(candidate > maxMonthKey ? 'future' : 'past');
            return;
          }

          setSwipeAnimating(true);
          setSwipeDx(sign * getSwipeMax());
          setTimeout(() => {
            setMonth((prev) => shiftMonthKey(prev, delta));
            // create a simple slide-through effect
            setSwipeDx(-sign * getSwipeMax());
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setSwipeDx(0);
                setTimeout(() => setSwipeAnimating(false), 220);
              });
            });
          }, 140);
        };

        const handleStatsTouchCancel = () => {
          swipeStartRef.current = null;
          setSwipeDx(0);
        };

        // Desktop/DevTools support: drag mouse to simulate swipe
        const handleStatsPointerDown = (e) => {
          try {
            if (!e) return;
            if (e.pointerType === 'touch') return; // handled by touch events
            if (typeof e.button === 'number' && e.button !== 0) return;
            if (swipeAnimating) return;
            const target = e.target;
            if (target && typeof target.closest === 'function') {
              const interactive = target.closest('input, textarea, select, button, a, [role="button"], [contenteditable="true"], .dropdown-menu, .modal');
              if (interactive) {
                swipeStartRef.current = null;
                return;
              }
            }
            swipeStartRef.current = { x: e.clientX, y: e.clientY, at: Date.now(), swiping: false };
            try {
              e.currentTarget?.setPointerCapture?.(e.pointerId);
            } catch {
              // ignore
            }
          } catch {
            swipeStartRef.current = null;
          }
        };

        const handleStatsPointerMove = (e) => {
          try {
            if (!e) return;
            if (e.pointerType === 'touch') return;
            const start = swipeStartRef.current;
            if (!start || swipeAnimating) return;

            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            const adx = Math.abs(dx);
            const ady = Math.abs(dy);

            if (!start.swiping) {
              if (adx > 12 && adx > ady * 1.2) {
                start.swiping = true;
                setSwipeAnimating(false);
              } else {
                return;
              }
            }

            const maxDx = getSwipeMax();
            setSwipeDx(clamp(dx, -maxDx, maxDx));
          } catch {
            // ignore
          }
        };

        const handleStatsPointerUp = (e) => {
          try {
            if (!e) return;
            if (e.pointerType === 'touch') return;
            const start = swipeStartRef.current;
            swipeStartRef.current = null;
            if (!start || swipeAnimating || !start.swiping) {
              setSwipeDx(0);
              return;
            }

            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            const dt = Date.now() - start.at;

            const adx = Math.abs(dx);
            const ady = Math.abs(dy);

            if (dt > 1000) return;
            if (adx < 30) {
              setSwipeDx(0);
              return;
            }
            if (adx < ady * 1.5) return;

            const threshold = getNavThreshold();
            const shouldNav = adx >= threshold;
            const sign = dx > 0 ? 1 : -1;

            if (!shouldNav) {
              setSwipeAnimating(true);
              setSwipeDx(0);
              setTimeout(() => setSwipeAnimating(false), 220);
              return;
            }

            const delta = sign > 0 ? -1 : 1;
            const candidate = shiftMonthKey(month, delta);
            if (!isMonthInRange(candidate)) {
              setSwipeAnimating(true);
              setSwipeDx(sign * Math.floor(getSwipeMax() * 0.55));
              setTimeout(() => {
                setSwipeDx(0);
                setTimeout(() => setSwipeAnimating(false), 200);
              }, 140);
              maybeToastMonthLimit(candidate > maxMonthKey ? 'future' : 'past');
              return;
            }

            setSwipeAnimating(true);
            setSwipeDx(sign * getSwipeMax());
            setTimeout(() => {
              setMonth((prev) => shiftMonthKey(prev, delta));
              setSwipeDx(-sign * getSwipeMax());
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  setSwipeDx(0);
                  setTimeout(() => setSwipeAnimating(false), 220);
                });
              });
            }, 140);
          } catch {
            swipeStartRef.current = null;
          }
        };

        const handleStatsPointerCancel = () => {
          swipeStartRef.current = null;
          setSwipeDx(0);
        };

        const swipeHint = swipeDx > 0 ? 'Tháng trước' : (swipeDx < 0 ? 'Tháng sau' : '');
        const rawTargetMonth = swipeDx > 0 ? shiftMonthKey(month, -1) : (swipeDx < 0 ? shiftMonthKey(month, 1) : '');
        const swipeTargetMonth = rawTargetMonth && isMonthInRange(rawTargetMonth) ? rawTargetMonth : '';
        const swipeHintOpacity = Math.min(1, Math.abs(swipeDx) / Math.max(1, getNavThreshold()));

        return (
          <div
            className="product-manager pb-5 mb-4 stats-manager"
            ref={statsRootRef}
            style={{
              touchAction: 'pan-y',
              transform: `translateX(${swipeDx}px)`,
              transition: swipeAnimating ? 'transform 220ms ease' : 'none',
              willChange: 'transform',
            }}
            onTouchStartCapture={handleStatsTouchStart}
            onTouchMoveCapture={handleStatsTouchMove}
            onTouchEndCapture={handleStatsTouchEnd}
            onTouchCancelCapture={handleStatsTouchCancel}
            onPointerDown={handleStatsPointerDown}
            onPointerMove={handleStatsPointerMove}
            onPointerUp={handleStatsPointerUp}
            onPointerCancel={handleStatsPointerCancel}
          >
            {!!swipeHint && (
              <div
                aria-hidden="true"
                style={{
                  position: 'fixed',
                  left: 0,
                  right: 0,
                  top: 84,
                  zIndex: 1060,
                  pointerEvents: 'none',
                  opacity: 0.15 + 0.55 * swipeHintOpacity,
                  transform: 'translateZ(0)',
                }}
              >
                <div className="d-flex justify-content-center">
                  <div className="px-3 py-2 rounded-pill bg-dark text-white shadow-sm" style={{ fontSize: 13 }}>
                    {swipeDx > 0 ? '←' : '→'} {swipeHint} · {swipeTargetMonth}
                  </div>
                </div>
              </div>
            )}
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

            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <div className="fw-semibold">
                    <i className="fas fa-file-excel me-2 text-success"></i>
                    Đối soát công nợ (Excel)
                  </div>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <span className="text-muted small">Check: <span className="fw-semibold">Tên sản phẩm</span> + <span className="fw-semibold">Tổng tiền thu hộ</span></span>
                  </div>
                </div>

                {xlsxStatus === 'loading' && (
                  <div className="alert alert-info mt-3 mb-0">
                    Đang tải thư viện đọc Excel (XLSX)...
                  </div>
                )}

                {xlsxStatus === 'failed' && (
                  <div className="alert alert-warning mt-3 mb-0">
                    Không tải được thư viện đọc Excel (XLSX). Hãy kiểm tra mạng / chặn CDN (AdBlock) hoặc refresh lại trang.
                  </div>
                )}

                <div className="row g-2 align-items-end mt-2">
                  <div className="col-12 col-md-7">
                    <label className="form-label mb-1">Upload file Excel</label>
                    <input
                      type="file"
                      className="form-control"
                      accept=".xlsx,.xls,.csv"
                      disabled={reconRunning}
                      onChange={async (e) => {
                        const f = e.target.files && e.target.files[0];
                        if (!f) return;
                        await reconcileExcelAgainstSystem(f);
                      }}
                    />
                    <div className="form-text">
                      {reconFileName ? `File: ${reconFileName}` : 'Header cần có: "Tên sản phẩm" và "Tổng Tiền Thu Hộ". Có cột "Ngày" thì sẽ tự tải đúng tháng trong file.'}
                    </div>
                  </div>

                  <div className="col-12 col-md-5 d-flex gap-2 justify-content-md-end">
                    <button
                      className="btn btn-outline-secondary"
                      disabled={reconRunning}
                      onClick={() => {
                        setReconError('');
                        setReconProgress('');
                        setReconResult(null);
                        setReconFileName('');
                        showToast('Đã reset đối soát', 'info');
                      }}
                    >
                      <i className="fas fa-rotate-left me-2"></i>Reset
                    </button>
                  </div>
                </div>

                {reconProgress && (
                  <div className="mt-2 small text-muted">{reconProgress}</div>
                )}

                {reconError && (
                  <div className="alert alert-danger mt-3 mb-0">{reconError}</div>
                )}

                {reconResult && (
                  <div className="mt-3">
                    <div className={`alert ${reconResult.ok ? 'alert-success' : 'alert-warning'} mb-3`}>
                      {reconResult.ok ? (
                        <div className="fw-semibold">OK — File Excel đã khớp đầy đủ với hệ thống.</div>
                      ) : (
                        <div className="fw-semibold">CHƯA KHỚP — Có thiếu/sai lệch so với hệ thống.</div>
                      )}
                      <div className="small mt-1">
                        Tháng đối soát: {Array.isArray(reconResult.monthKeys) ? reconResult.monthKeys.join(', ') : ''} · Excel: {reconResult.excelCount} dòng · Hệ thống: {reconResult.systemCount} đơn
                      </div>
                    </div>

                    {!reconResult.ok && (
                      <div className="row g-2">
                        <div className="col-12">
                          {Array.isArray(reconResult.amountMismatch) && reconResult.amountMismatch.length > 0 && (
                            <div className="card border-0 shadow-sm mb-2">
                              <div className="card-body">
                                <div className="fw-semibold mb-2 text-danger">Sai lệch số tiền (tìm theo tên sản phẩm)</div>
                                <div className="table-responsive">
                                  <table className="table table-sm align-middle mb-0">
                                    <thead>
                                      <tr>
                                        <th>Excel (dòng)</th>
                                        <th>Tên sản phẩm (Excel)</th>
                                        <th className="text-end">Thu hộ (Excel)</th>
                                        <th>Order ID</th>
                                        <th>Tên SP (Hệ thống)</th>
                                        <th className="text-end">Thu hộ (Hệ thống)</th>
                                        <th className="text-end">Lệch</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {reconResult.amountMismatch.slice(0, 30).map((x) => (
                                        <tr key={`mm-${x.row.rowIndex}`}
                                          className="table-danger">
                                          <td>{x.row.rowIndex}</td>
                                          <td style={{ minWidth: 260 }}>{x.row.product}</td>
                                          <td className="text-end fw-semibold">{window.KTM.money.formatNumber(x.row.cod)}</td>
                                          <td className="text-muted">{x.order.id}</td>
                                          <td style={{ minWidth: 240 }}>{x.order.productSummary}</td>
                                          <td className="text-end fw-semibold">{window.KTM.money.formatNumber(x.order.cod)}</td>
                                          <td className="text-end fw-semibold">{window.KTM.money.formatNumber(x.diff)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                {reconResult.amountMismatch.length > 30 && (
                                  <div className="text-muted small mt-2">Đang hiển thị 30/{reconResult.amountMismatch.length} dòng.</div>
                                )}
                              </div>
                            </div>
                          )}

                          {Array.isArray(reconResult.excelOnly) && reconResult.excelOnly.length > 0 && (
                            <div className="card border-0 shadow-sm mb-2">
                              <div className="card-body">
                                <div className="fw-semibold mb-2 text-warning">Có trong Excel nhưng không thấy đơn khớp trong hệ thống</div>
                                <div className="table-responsive">
                                  <table className="table table-sm align-middle mb-0">
                                    <thead>
                                      <tr>
                                        <th>Excel (dòng)</th>
                                        <th>Ngày</th>
                                        <th>Tên sản phẩm</th>
                                        <th className="text-end">Thu hộ</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {reconResult.excelOnly.slice(0, 30).map((r) => (
                                        <tr key={`eo-${r.rowIndex}`} className="table-warning">
                                          <td>{r.rowIndex}</td>
                                          <td className="text-muted">{String(r.dateRaw || '')}</td>
                                          <td style={{ minWidth: 280 }}>{r.product}</td>
                                          <td className="text-end fw-semibold">{window.KTM.money.formatNumber(r.cod)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                {reconResult.excelOnly.length > 30 && (
                                  <div className="text-muted small mt-2">Đang hiển thị 30/{reconResult.excelOnly.length} dòng.</div>
                                )}
                              </div>
                            </div>
                          )}

                          {Array.isArray(reconResult.systemOnly) && reconResult.systemOnly.length > 0 && (
                            <div className="card border-0 shadow-sm">
                              <div className="card-body">
                                <div className="fw-semibold mb-2 text-warning">Có trong hệ thống nhưng thiếu trong Excel</div>
                                <div className="table-responsive">
                                  <table className="table table-sm align-middle mb-0">
                                    <thead>
                                      <tr>
                                        <th>Order ID</th>
                                        <th>Ngày tạo</th>
                                        <th>Tên sản phẩm</th>
                                        <th className="text-end">Thu hộ</th>
                                        <th>Trạng thái</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {reconResult.systemOnly.slice(0, 30).map((o) => (
                                        <tr key={`so-${o.id}`} className="table-warning">
                                          <td className="text-muted">{o.id}</td>
                                          <td className="text-muted">{window.KTM.date.formatDateTime(o.created_at)}</td>
                                          <td style={{ minWidth: 280 }}>{o.productSummary}</td>
                                          <td className="text-end fw-semibold">{window.KTM.money.formatNumber(o.cod)}</td>
                                          <td className="text-muted">{o.status}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                {reconResult.systemOnly.length > 30 && (
                                  <div className="text-muted small mt-2">Đang hiển thị 30/{reconResult.systemOnly.length} đơn.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
              trackRecentMenu(menu);
              setActiveMenu(menu);
              if (menu === 'albums') {
                setCurrentAlbumFolder(null);
                setAlbumBreadcrumb([]);
                loadAlbums(null);
              }
            }} 
            onLogout={handleLogout}
            currentUser={currentUser}
            pinnedMenus={pinnedMenus}
            recentMenus={recentMenus}
            onTogglePin={togglePinnedMenu}
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
