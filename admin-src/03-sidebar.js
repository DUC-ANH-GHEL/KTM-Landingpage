    // Sidebar
    const ADMIN_PINS_STORAGE_KEY = 'ktm_admin_pins_v1';
    const ADMIN_RECENT_STORAGE_KEY = 'ktm_admin_recent_v1';

    function loadAdminMenuIdsFromStorage(key) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.map((x) => String(x || '').trim()).filter(Boolean) : [];
      } catch {
        return [];
      }
    }

    function saveAdminMenuIdsToStorage(key, ids) {
      try {
        localStorage.setItem(key, JSON.stringify(Array.isArray(ids) ? ids : []));
      } catch {
        // ignore
      }
    }

    function loadAdminPins() {
      return loadAdminMenuIdsFromStorage(ADMIN_PINS_STORAGE_KEY);
    }

    function saveAdminPins(ids) {
      saveAdminMenuIdsToStorage(ADMIN_PINS_STORAGE_KEY, ids);
      return ids;
    }

    function loadAdminRecent() {
      return loadAdminMenuIdsFromStorage(ADMIN_RECENT_STORAGE_KEY);
    }

    function saveAdminRecent(ids) {
      saveAdminMenuIdsToStorage(ADMIN_RECENT_STORAGE_KEY, ids);
      return ids;
    }

    function Sidebar({ activeMenu, onMenuChange, onLogout, currentUser, pinnedMenus, recentMenus, onTogglePin }) {
      const menus = [
        { id: 'search', icon: 'fa-search', label: 'Tra cứu nhanh', highlight: true },
        { id: 'albums', icon: 'fa-images', label: 'Quản lý Album' },
        { id: 'videos', icon: 'fa-video', label: 'Quản lý Video' },
        { id: 'products', icon: 'fa-box', label: 'Sản phẩm' },
        { id: 'orders', icon: 'fa-receipt', label: 'Quản lý đơn hàng' },
        { id: 'recon', icon: 'fa-file-excel', label: 'Đối soát Excel' },
        { id: 'stats', icon: 'fa-chart-column', label: 'Thống kê' },
        { id: 'settings', icon: 'fa-cog', label: 'Cài đặt' },
      ];

      const displayName =
        currentUser?.username || currentUser?.name || currentUser?.email || 'Admin';

      const menuById = useMemo(() => {
        const m = new Map();
        for (const item of menus) m.set(item.id, item);
        return m;
      }, []);

      const pinned = Array.isArray(pinnedMenus) ? pinnedMenus : [];
      const recent = Array.isArray(recentMenus) ? recentMenus : [];
      const pinnedItems = pinned.map((id) => menuById.get(id)).filter(Boolean);
      const recentItems = recent
        .filter((id) => id !== activeMenu)
        .map((id) => menuById.get(id))
        .filter(Boolean)
        .slice(0, 2);

      const isPinned = (id) => pinned.includes(id);

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

          <nav className="nav flex-column mt-3 sidebar-nav">
            {pinnedItems.length > 0 && (
              <>
                <div className="sidebar-section-title">Pinned</div>
                <div className="sidebar-quicklist">
                  {pinnedItems.map(menu => (
                    <a
                      key={`pin-${menu.id}`}
                      href="#"
                      className={`nav-link ${activeMenu === menu.id ? 'active' : ''} sidebar-quicklink`}
                      onClick={(e) => { e.preventDefault(); onMenuChange(menu.id); }}
                    >
                      <i className={`fas ${menu.icon}`}></i> {menu.label}
                      <button
                        type="button"
                        className={`sidebar-pin-btn pinned`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin && onTogglePin(menu.id); }}
                        title="Bỏ ghim"
                        aria-label="Bỏ ghim"
                      >
                        <i className="fas fa-thumbtack"></i>
                      </button>
                    </a>
                  ))}
                </div>
              </>
            )}

            {recentItems.length > 0 && (
              <>
                <div className="sidebar-section-title">Recent</div>
                <div className="sidebar-quicklist">
                  {recentItems.map(menu => (
                    <a
                      key={`recent-${menu.id}`}
                      href="#"
                      className={`nav-link ${activeMenu === menu.id ? 'active' : ''} sidebar-quicklink`}
                      onClick={(e) => { e.preventDefault(); onMenuChange(menu.id); }}
                    >
                      <i className={`fas ${menu.icon}`}></i> {menu.label}
                    </a>
                  ))}
                </div>
              </>
            )}

            <div className="sidebar-section-title">Menu</div>
            <div className="sidebar-menu-scroll" aria-label="Danh sách menu">
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

                  <button
                    type="button"
                    className={`sidebar-pin-btn ${isPinned(menu.id) ? 'pinned' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onTogglePin && onTogglePin(menu.id);
                    }}
                    title={isPinned(menu.id) ? 'Bỏ ghim' : 'Ghim'}
                    aria-label={isPinned(menu.id) ? 'Bỏ ghim' : 'Ghim'}
                  >
                    <i className="fas fa-thumbtack"></i>
                  </button>
                </a>
              ))}
            </div>
          </nav>
          <div className="sidebar-footer w-100 p-3 border-top border-secondary">
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

