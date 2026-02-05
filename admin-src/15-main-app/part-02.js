        const statsRootRef = useRef(null);
        const [swipeDx, setSwipeDx] = useState(0);
        const [swipeAnimating, setSwipeAnimating] = useState(false);
        const swipeLimitToastAtRef = useRef(0);
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

        /* NOTE: Excel reconciliation has been moved out of StatsManager.
           See ReconExcelManager in admin-src/15a-recon-excel.js. */

          if (false) {
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

        const normalizeProductForMatch = (value) => {
          let s = normalizeLoose(value);
          if (!s) return '';

          s = s
            .replace(/\bxi\s*lanh\b/g, 'xylanh')
            .replace(/\bxy\s*lanh\b/g, 'xylanh')
            .replace(/\bxy-?lanh\b/g, 'xylanh')
            .replace(/\bvat\s*lieu\b/g, 'vatlieu')
            .replace(/[\+|]+/g, ' ');

          // Normalize common size formats: 1m8, 1.8m, 180cm => 1.8m (string-level)
          s = s
            .replace(/\b(\d)\s*m\s*(\d)\b/g, (_m, a, b) => `${a}.${b}m`)
            .replace(/\b(\d+(?:\.\d+)?)\s*cm\b/g, (_m, cmRaw) => {
              const cm = Number(cmRaw);
              if (!Number.isFinite(cm) || cm <= 0) return `${cmRaw}cm`;
              const m = cm / 100;
              const mm = (Math.round(m * 100) / 100).toString();
              return `${mm}m`;
            })
            .replace(/\bsize\b\s*[:\-]?\s*/g, ' ');

          // Remove some generic stop-words that add noise
          const stop = new Set(['ktm', 'size', 'loai', 'loai:', 'loai-', 'co', 'day', 'lap', 'tren', 'xoi', 'bo', 'san', 'pham']);
          const toks = s.split(' ').map((t) => t.trim()).filter(Boolean);
          const out = [];
          for (const t of toks) {
            if (stop.has(t)) continue;
            if (t === 'loai') continue;
            out.push(t);
          }
          return out.join(' ').replace(/\s+/g, ' ').trim();
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

        const parseExcelDateToDayKey = (cell) => {
          if (cell == null || cell === '') return '';
          if (typeof cell === 'number' && Number.isFinite(cell) && window?.XLSX?.SSF?.parse_date_code) {
            try {
              const d = window.XLSX.SSF.parse_date_code(cell);
              if (!d || !d.y || !d.m || !d.d) return '';
              return `${String(d.y).padStart(4, '0')}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
            } catch {
              // ignore
            }
          }

          const s = String(cell).trim();
          const m = s.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})$/);
          if (m) {
            const dd = String(Number(m[1]) || 0).padStart(2, '0');
            const mm = String(Number(m[2]) || 0).padStart(2, '0');
            return `${m[3]}-${mm}-${dd}`;
          }

          const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

          const d = new Date(s);
          if (!Number.isNaN(d.getTime())) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }
          return '';
        };

        const parseExcelMoney = (cell) => {
          if (cell == null || cell === '') return 0;
          if (typeof cell === 'number' && Number.isFinite(cell)) return Math.trunc(cell);

          const s0 = String(cell ?? '').trim();
          if (!s0) return 0;
          // Fast path: reuse KTM parser
          try {
            const n = window.KTM.money.parseMoney(s0);
            if (Number.isFinite(n) && n > 0) return Math.trunc(n);
          } catch {
            // ignore
          }

          // Robust path: strip currency/unit symbols then keep digits
          const s = s0
            .toLowerCase()
            .replace(/vnd|đ|d/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          const digits = s.replace(/[^0-9]/g, '');
          if (!digits) return 0;
          const n2 = Number(digits);
          if (!Number.isFinite(n2)) return 0;
          return Math.trunc(n2);
        };

        const normalizePhoneDigits = (value) => {
          let digits = '';
          try {
            if (window?.KTM?.phone?.normalize) digits = window.KTM.phone.normalize(value);
          } catch {
            // ignore
          }

          if (!digits) digits = String(value ?? '').replace(/[^0-9]/g, '');
          digits = String(digits || '').replace(/[^0-9]/g, '');
          if (!digits) return '';

          // Canonicalize VN phone: treat 84xxxxxxxxx, 840xxxxxxxxx and 0xxxxxxxxx as the same.
          // Example: 84335615735 -> 0335615735
          if (digits.startsWith('840')) {
            digits = `0${digits.slice(3)}`;
          } else if (digits.startsWith('84')) {
            // Most common: 84 + 9 digits (E.164 without leading 0)
            if (digits.length === 11) digits = `0${digits.slice(2)}`;
            // Some sources may include 84 + 10 digits; still prefer stripping 84.
            else if (digits.length === 12 && digits[2] !== '0') digits = `0${digits.slice(2)}`;
          }

          // Excel sometimes drops the leading 0 (9-digit tail)
          if (digits.length === 9) digits = `0${digits}`;

          return digits;
        };

        const downloadCSV = (filename, rows) => {
          try {
            const arr = Array.isArray(rows) ? rows : [];
            const escape = (v) => {
              const s = String(v ?? '');
              if (/[\n\r",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
              return s;
            };
            const csv = arr.map((r) => (Array.isArray(r) ? r.map(escape).join(',') : '')).join('\n');
            const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              try { URL.revokeObjectURL(url); } catch {}
              try { a.remove(); } catch {}
            }, 0);
          } catch {
            // ignore
          }
        };

        const extractPhoneFromText = (textRaw) => {
          const text = String(textRaw ?? '');
          if (!text.trim()) return { phone: '', phoneNorm: '', cleanedText: String(textRaw ?? '').trim() };

          // Try to find a phone-like substring first (avoid picking up "2m4" etc)
          const re = /(?:\+?84|0)\s*[0-9\s\-.()]{8,16}/g;
          let best = null;
          let m;
          while ((m = re.exec(text)) != null) {
            const raw = m[0];
            const digits = normalizePhoneDigits(raw);
            if (!digits) continue;
            if (digits.length < 9 || digits.length > 12) continue;
            best = { raw, digits };
          }

          // Fallback: if there is a long enough digit tail, use it.
          if (!best) {
            const digitsAll = normalizePhoneDigits(text);
            if (digitsAll.length >= 9) {
              const tail = digitsAll.slice(-12);
              if (tail.length >= 9) best = { raw: tail, digits: tail };
            }
          }

          if (!best) return { phone: '', phoneNorm: '', cleanedText: text.trim() };

          const phoneNorm = best.digits;
          const phone = phoneNorm;

          // Remove the matched raw phone substring if present
          let cleaned = text;
          if (best.raw && text.includes(best.raw)) {
            cleaned = cleaned.replace(best.raw, ' ');
          } else {
            // Otherwise remove the trailing digits (best-effort)
            cleaned = cleaned.replace(new RegExp(`${best.digits}$`), ' ');
          }

          cleaned = cleaned
            .replace(/[\-–—•|]+\s*$/g, ' ')
            .replace(/\s+[\-–—•|]+\s*/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          return { phone, phoneNorm, cleanedText: cleaned };
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

        const readExcelGrid = async (file) => {
          if (!file) throw new Error('Chưa chọn file');
          const buf = await file.arrayBuffer();
          const size = Number(file.size || 0) || 0;

          const canWorker = Boolean(window?.Worker && typeof Blob !== 'undefined' && typeof URL !== 'undefined');
          if (!canWorker || size < 450 * 1024) {
            if (!window?.XLSX?.read) throw new Error('Thiếu thư viện đọc Excel (XLSX). Vui lòng tải lại trang admin.');
            const wb = window.XLSX.read(buf, { type: 'array' });
            const sheetName = wb?.SheetNames?.[0];
            const ws = sheetName ? wb.Sheets[sheetName] : null;
            if (!ws) throw new Error('Không đọc được sheet trong file');
            return window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
          }

          const workerCode = `
            let ready = false;
            const sources = [
              'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
              'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
              'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
            ];

            const hasXlsx = () => Boolean(self.XLSX && typeof self.XLSX.read === 'function');
            const ensureXlsx = async () => {
              if (hasXlsx()) return true;
              for (const src of sources) {
                try {
                  self.importScripts(src);
                  if (hasXlsx()) return true;
                } catch (e) {
                  // try next
                }
              }
              return hasXlsx();
            };

            self.onmessage = async (ev) => {
              try {
                const data = ev && ev.data;
                const buf = data && data.buf;
                const ok = await ensureXlsx();
                if (!ok) throw new Error('XLSX not available');
                const wb = self.XLSX.read(buf, { type: 'array' });
                const sheetName = wb && wb.SheetNames && wb.SheetNames[0];
                const ws = sheetName ? wb.Sheets[sheetName] : null;
                if (!ws) throw new Error('No sheet');
                const grid = self.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
                self.postMessage({ ok: true, grid });
              } catch (e) {
                self.postMessage({ ok: false, error: String((e && e.message) || e || 'worker error') });
              }
            };
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          const w = new Worker(url);

          try {
            const grid = await new Promise((resolve, reject) => {
              const t = setTimeout(() => {
                try { w.terminate(); } catch {}
                reject(new Error('Worker timeout'));
              }, 12000);

              w.onmessage = (ev) => {
                const msg = ev && ev.data;
                if (msg && msg.ok) {
                  clearTimeout(t);
                  resolve(msg.grid);
                } else if (msg && msg.ok === false) {
                  clearTimeout(t);
                  reject(new Error(msg.error || 'Worker failed'));
                }
              };
              w.onerror = () => {
                clearTimeout(t);
                reject(new Error('Worker error'));
              };

              try {
                w.postMessage({ buf }, [buf]);
              } catch {
                w.postMessage({ buf });
              }
            });
            return grid;
          } finally {
            try { w.terminate(); } catch {}
            try { URL.revokeObjectURL(url); } catch {}
          }
        };

        const parseExcelFileRows = async (file) => {
          if (!file) throw new Error('Chưa chọn file');
          const grid = await readExcelGrid(file);
          const rows = Array.isArray(grid) ? grid : [];