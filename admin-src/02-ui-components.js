    // ==================== COMPONENTS ====================

    // Toast notification
    function Toast({ message, type, onClose, actionLabel, onAction, durationMs }) {
      useEffect(() => {
        const ms = Number(durationMs);
        const ttl = Number.isFinite(ms) && ms > 0 ? ms : 3000;
        const timer = setTimeout(onClose, ttl);
        return () => clearTimeout(timer);
      }, [onClose, durationMs]);

      return (
        <div className={`toast show align-items-center text-white bg-${type} border-0`} role="alert">
          <div className="d-flex align-items-center">
            <div className="toast-body">{message}</div>
            {actionLabel && typeof onAction === 'function' && (
              <button
                type="button"
                className="btn btn-sm btn-light toast-action"
                onClick={() => {
                  try {
                    onAction();
                  } finally {
                    onClose();
                  }
                }}
              >
                {actionLabel}
              </button>
            )}
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

