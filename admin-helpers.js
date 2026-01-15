(function initKTMAdminHelpers() {
  const root = typeof window !== 'undefined' ? window : globalThis;
  const KTM = root.KTM || (root.KTM = {});

  const money = KTM.money || (KTM.money = {});

  money.parseMoney = money.parseMoney || function parseMoney(value) {
    if (value == null || value === '') return 0;
    const digits = String(value).replace(/[^0-9]/g, '');
    return digits ? Number(digits) : 0;
  };

  money.parseSignedMoney = money.parseSignedMoney || function parseSignedMoney(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0;
    const s = String(value).trim();
    if (!s) return 0;
    const isNeg = /^\s*-/.test(s);
    const digits = s.replace(/[^0-9]/g, '');
    const n = digits ? Number(digits) : 0;
    return isNeg ? -n : n;
  };

  money.formatNumber = money.formatNumber || function formatNumber(n) {
    try {
      return Number(n || 0).toLocaleString('vi-VN');
    } catch {
      return String(n || 0);
    }
  };

  money.formatVND = money.formatVND || function formatVND(n) {
    return `${money.formatNumber(n)}đ`;
  };

  money.parseShipFeeFromNote = money.parseShipFeeFromNote || function parseShipFeeFromNote(note) {
    if (!note) return null;
    const s = String(note);
    const lower = s.toLowerCase();

    if (
      lower.includes('freeship') ||
      lower.includes('free ship') ||
      lower.includes('miễn phí ship') ||
      lower.includes('mien phi ship') ||
      lower.includes('miễn phí vận chuyển') ||
      lower.includes('mien phi van chuyen')
    ) {
      return 0;
    }

    const m = s.match(
      /(?:ship|vận\s*chuyển|van\s*chuyen|\bvc\b)\s*[:=\-]?\s*([0-9][0-9\.,\s]*)(?:\s*(k|nghìn|nghin|tr|triệu|trieu|m))?/i
    );
    if (!m) return null;

    const digits = String(m[1] || '').replace(/[^0-9]/g, '');
    if (!digits) return null;

    let amount = Number(digits);
    const unit = String(m[2] || '').toLowerCase();
    if (unit === 'k' || unit.startsWith('ngh')) amount *= 1000;
    else if (unit === 'tr' || unit.startsWith('tri') || unit === 'm') amount *= 1000000;

    return Number.isFinite(amount) ? amount : null;
  };

  money.getShipFeeForItems = money.getShipFeeForItems || function getShipFeeForItems(items) {
    const arr = Array.isArray(items) ? items : [];
    let found = false;
    let maxFee = 0;
    for (const it of arr) {
      const fee = money.parseShipFeeFromNote(it?.product_note);
      if (fee == null) continue;
      found = true;
      if (fee > maxFee) maxFee = fee;
    }
    return { found, fee: maxFee };
  };

  money.getDigits = money.getDigits || function getDigits(value) {
    if (value == null) return '';
    return String(value).replace(/[^0-9]/g, '');
  };

  money.formatVNDInputDigits = money.formatVNDInputDigits || function formatVNDInputDigits(digits) {
    const s = String(digits ?? '').replace(/[^0-9]/g, '');
    if (!s) return '';
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
  };

  money.nextPriceInputState = money.nextPriceInputState || function nextPriceInputState(rawValue, prevDigits) {
    const digits = money.getDigits(rawValue);
    const prev = String(prevDigits ?? '');

    if (!digits) {
      return { digits: '', price: '' };
    }

    if (digits === prev && digits.length > 0) {
      const newDigits = digits.slice(0, -1);
      return { digits: newDigits, price: money.formatVNDInputDigits(newDigits) };
    }

    return { digits, price: money.formatVNDInputDigits(digits) };
  };

  const orders = KTM.orders || (KTM.orders = {});

  const clipboard = KTM.clipboard || (KTM.clipboard = {});

  clipboard.writeText = clipboard.writeText || async function writeText(text) {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(String(text ?? ''));
      return;
    }

    const ta = document.createElement('textarea');
    ta.value = String(text ?? '');
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (!ok) throw new Error('copy_failed');
  };

  clipboard.writeImageFromUrl = clipboard.writeImageFromUrl || async function writeImageFromUrl(url) {
    const u = String(url ?? '');
    if (!u) throw new Error('empty_url');

    const response = await fetch(u);
    const blob = await response.blob();

    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (!nav?.clipboard?.write || typeof ClipboardItem === 'undefined') {
      throw new Error('clipboard_image_unsupported');
    }

    await nav.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
  };

  const phone = KTM.phone || (KTM.phone = {});

  phone.normalize = phone.normalize || function normalize(value) {
    if (!value) return '';
    return String(value).replace(/[^0-9]/g, '');
  };

  phone.isValid = phone.isValid || function isValid(normalizedDigits) {
    const digits = phone.normalize(normalizedDigits);
    return digits.length >= 9 && digits.length <= 12;
  };

  const date = KTM.date || (KTM.date = {});

  date.formatDateTime = date.formatDateTime || function formatDateTime(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    try {
      return d.toLocaleString('vi-VN');
    } catch {
      return d.toISOString();
    }
  };

  const cache = KTM.cache || (KTM.cache = {});

  cache.read = cache.read || function read(key, options) {
    const ttlMs = Number(options?.ttlMs ?? 0);
    const validate = typeof options?.validate === 'function' ? options.validate : null;
    const k = String(key ?? '');
    if (!k) return { hit: false, value: null, status: 'invalid' };

    try {
      const raw = localStorage.getItem(k);
      if (!raw) return { hit: false, value: null, status: 'miss' };

      const parsed = JSON.parse(raw);
      const ts = Number(parsed?.timestamp ?? 0);
      const data = parsed?.data;

      if (!ts || !Number.isFinite(ts)) return { hit: false, value: null, status: 'invalid' };
      if (ttlMs > 0 && Date.now() - ts >= ttlMs) return { hit: false, value: null, status: 'expired' };
      if (validate && !validate(data)) return { hit: false, value: null, status: 'invalid' };

      return { hit: true, value: data, status: 'hit' };
    } catch {
      return { hit: false, value: null, status: 'error' };
    }
  };

  cache.write = cache.write || function write(key, data) {
    const k = String(key ?? '');
    if (!k) return false;
    try {
      localStorage.setItem(k, JSON.stringify({ data, timestamp: Date.now() }));
      return true;
    } catch {
      return false;
    }
  };

  cache.remove = cache.remove || function remove(key) {
    const k = String(key ?? '');
    if (!k) return false;
    try {
      localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  };

  const api = KTM.api || (KTM.api = {});

  api.request = api.request || function request(url, fetchOptions) {
    return fetch(String(url ?? ''), fetchOptions);
  };

  api.requestJSON = api.requestJSON || async function requestJSON(url, fetchOptions, fallbackErrorMessage) {
    const res = await api.request(url, fetchOptions);

    let data = null;
    let text = '';
    try {
      data = await res.json();
    } catch {
      try {
        text = await res.text();
      } catch {
        text = '';
      }
    }

    if (!res.ok) {
      const msg =
        (data && typeof data === 'object' && (data.error || data.message))
          ? String(data.error || data.message)
          : (typeof data === 'string' && data.trim())
            ? data.trim()
            : (text && text.trim())
              ? text.trim()
              : (fallbackErrorMessage || `API error (${res.status})`);
      throw new Error(msg);
    }

    return data;
  };

  api.getJSON = api.getJSON || function getJSON(url, fallbackErrorMessage) {
    return api.requestJSON(url, { method: 'GET' }, fallbackErrorMessage);
  };

  api.postJSON = api.postJSON || function postJSON(url, body, fallbackErrorMessage) {
    return api.requestJSON(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {})
      },
      fallbackErrorMessage
    );
  };

  api.putJSON = api.putJSON || function putJSON(url, body, fallbackErrorMessage) {
    return api.requestJSON(
      url,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {})
      },
      fallbackErrorMessage
    );
  };

  api.deleteJSON = api.deleteJSON || function deleteJSON(url, fallbackErrorMessage) {
    return api.requestJSON(url, { method: 'DELETE' }, fallbackErrorMessage);
  };

  const cloudinary = KTM.cloudinary || (KTM.cloudinary = {});

  cloudinary.uploadImage = cloudinary.uploadImage || async function uploadImage(options) {
    const cloudName = String(options?.cloudName ?? '').trim();
    const uploadPreset = String(options?.uploadPreset ?? '').trim();
    const folder = options?.folder != null ? String(options.folder).trim() : '';
    const file = options?.file;

    if (!cloudName) throw new Error('Thiếu cấu hình Cloudinary');
    if (!uploadPreset) throw new Error('Thiếu cấu hình Cloudinary');
    if (!file) throw new Error('Thiếu file upload');

    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', uploadPreset);
    if (folder) form.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: 'POST',
      body: form
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!data) {
      throw new Error('Upload failed');
    }

    if (!res.ok) {
      const msg =
        (typeof data === 'object' && data.error && typeof data.error === 'object' && data.error.message)
          ? String(data.error.message)
          : (typeof data === 'object' && (data.message || data.error))
            ? String(data.message || data.error)
            : 'Upload failed';
      throw new Error(msg);
    }

    return data;
  };

  orders.getOrderItems = orders.getOrderItems || function getOrderItems(order) {
    if (Array.isArray(order?.items) && order.items.length) return order.items;
    if (order?.product_id) {
      return [{
        product_id: order.product_id,
        quantity: Number(order.quantity || 1) || 1,
        product_price: order.product_price,
        product_name: order.product_name,
        product_code: order.product_code,
        product_note: order.product_note
      }];
    }
    return [];
  };

  orders.getOrderTotalQty = orders.getOrderTotalQty || function getOrderTotalQty(order) {
    const items = orders.getOrderItems(order);
    const sum = items.reduce((acc, it) => acc + (Number(it?.quantity || 0) || 0), 0);
    if (sum > 0) return sum;
    const legacy = Number(order?.total_quantity ?? order?.quantity ?? 0);
    return Number.isFinite(legacy) ? legacy : 0;
  };

  orders.getOrderAdjustmentMoney = orders.getOrderAdjustmentMoney || function getOrderAdjustmentMoney(order) {
    const v = order?.adjustment_amount;
    if (typeof v === 'number') return Number.isFinite(v) ? Math.trunc(v) : 0;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  };

  orders.getOrderItemRows = orders.getOrderItemRows || function getOrderItemRows(order, getProductById) {
    const items = orders.getOrderItems(order);
    if (!items.length) return [];

    const getP = typeof getProductById === 'function' ? getProductById : () => null;

    return items
      .map((it) => {
        const fromItem = it?.product_name;
        const pid = String(it?.product_id || '');
        const p = getP(pid);
        const name = (fromItem || p?.name || '').toString().trim();
        const qty = Number(it?.quantity ?? 1) || 1;
        const unitPrice = money.parseMoney(it?.product_price ?? p?.price);
        const lineTotal = qty * unitPrice;
        return { name, qty, unitPrice, lineTotal };
      })
      .filter((x) => x.name);
  };

  orders.getOrderProductSummary = orders.getOrderProductSummary || function getOrderProductSummary(order, getProductById) {
    const items = orders.getOrderItems(order);
    if (!items.length) return '—';

    const getP = typeof getProductById === 'function' ? getProductById : () => null;

    const names = items
      .map((it) => {
        const fromItem = it?.product_name;
        if (fromItem) return String(fromItem);
        const pid = String(it?.product_id || '');
        const p = getP(pid);
        return p?.name ? String(p.name) : '';
      })
      .filter(Boolean);

    if (names.length) return names.join(' + ');
    return order?.product_name || '—';
  };

  orders.getItemsSubtotal = orders.getItemsSubtotal || function getItemsSubtotal(items, getProductById) {
    const arr = Array.isArray(items) ? items : [];
    const getP = typeof getProductById === 'function' ? getProductById : () => null;

    return arr.reduce((sum, it) => {
      const qty = Number(it?.quantity || 0) || 0;
      const pid = String(it?.product_id || '');
      const p = getP(pid);
      const unitPrice = money.parseMoney(it?.product_price ?? p?.price);
      return sum + (qty * unitPrice);
    }, 0);
  };

  orders.getOrderShipInfo = orders.getOrderShipInfo || function getOrderShipInfo(items, getProductById) {
    const arr = Array.isArray(items) ? items : [];
    const getP = typeof getProductById === 'function' ? getProductById : () => null;

    let found = false;
    let maxFee = 0;
    for (const it of arr) {
      const pid = String(it?.product_id || '');
      const p = getP(pid);
      const note = it?.product_note ?? p?.note ?? null;
      const fee = money.parseShipFeeFromNote(note);
      if (fee == null) continue;
      found = true;
      if (fee > maxFee) maxFee = fee;
    }
    return { found, fee: maxFee };
  };

  orders.getOrderTotalMoney = orders.getOrderTotalMoney || function getOrderTotalMoney(order, getProductById) {
    const items = orders.getOrderItems(order);
    const subtotal = orders.getItemsSubtotal(items, getProductById);
    const ship = orders.getOrderShipInfo(items, getProductById).fee;
    const adj = orders.getOrderAdjustmentMoney(order);
    return subtotal + ship + adj;
  };

  orders.compareOrders = orders.compareOrders || function compareOrders(a, b) {
    const statusRank = { draft: -1, pending: 0, processing: 1, done: 2, paid: 3 };
    const getRank = (status) => (status in statusRank ? statusRank[status] : 99);
    const getCreatedTime = (v) => {
      if (!v) return Number.POSITIVE_INFINITY;
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
    };

    const ra = getRank(a?.status);
    const rb = getRank(b?.status);
    if (ra !== rb) return ra - rb;

    const ta = getCreatedTime(a?.created_at);
    const tb = getCreatedTime(b?.created_at);
    if (ta !== tb) return tb - ta;

    const ia = Number(a?.id);
    const ib = Number(b?.id);
    if (Number.isFinite(ia) && Number.isFinite(ib)) return ib - ia;
    return String(a?.id || '').localeCompare(String(b?.id || ''));
  };

  orders.sortOrders = orders.sortOrders || function sortOrders(arr) {
    return [...(arr || [])].sort(orders.compareOrders);
  };
})();
