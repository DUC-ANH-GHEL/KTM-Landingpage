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
