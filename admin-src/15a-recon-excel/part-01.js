		// ==================== EXCEL RECONCILIATION (SEPARATE MENU) ====================

		function getCurrentMonth() {
			const d = new Date();
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			return `${y}-${m}`;
		}

		function ReconExcelManager({ showToast }) {
			const toast = typeof showToast === 'function' ? showToast : (() => {});

			const [month, setMonth] = useState(getCurrentMonth());
			// Back-compat aliases (avoid runtime crash if UI code references old names)
			const currentMonth = month;
			const setCurrentMonth = setMonth;

			const [reconRunning, setReconRunning] = useState(false);
			const [reconError, setReconError] = useState('');
			const [reconProgress, setReconProgress] = useState('');
			const [reconFileName, setReconFileName] = useState('');
			const [reconResult, setReconResult] = useState(null);
			const [reconView, setReconView] = useState('all');
			const [reconPhoneFilter, setReconPhoneFilter] = useState('');
			const [reconExcludeDraft, setReconExcludeDraft] = useState(true);
			const [reconExcludeCanceled, setReconExcludeCanceled] = useState(true);
			const [reconExcludePaid, setReconExcludePaid] = useState(false);
			const [reconDateBasis, setReconDateBasis] = useState('created_at');
			const [reconEnableCodTolerance, setReconEnableCodTolerance] = useState(false);
			const [reconCodTolerance, setReconCodTolerance] = useState(0);
			const [reconPayRunning, setReconPayRunning] = useState(false);
			const [reconPayProgress, setReconPayProgress] = useState('');
			const [reconSelectedMatchIds, setReconSelectedMatchIds] = useState(() => new Set());
			const [reconDrawerOpen, setReconDrawerOpen] = useState(false);
			const [reconDrawerOrder, setReconDrawerOrder] = useState(null);

			const productsByIdRef = useRef(new Map());
			const ordersCacheRef = useRef(new Map());
			const xlsxLoadPromiseRef = useRef(null);
			const [xlsxStatus, setXlsxStatus] = useState(() => (window?.XLSX?.read ? 'ready' : 'loading'));

			const loadScriptOnce = (src) => new Promise((resolve, reject) => {
				try {
					if (!src) return resolve();
					const safeSrc = String(src);
					const existing = document.querySelector(`script[data-ktm-src="${safeSrc}"]`) || document.querySelector(`script[src="${safeSrc}"]`);
					if (existing) {
						if (existing.getAttribute('data-ktm-loaded') === '1') return resolve();
						if (window?.XLSX?.read) return resolve();
						existing.addEventListener('load', () => resolve(), { once: true });
						existing.addEventListener('error', () => reject(new Error(`Failed to load ${safeSrc}`)), { once: true });
						return;
					}

					const s = document.createElement('script');
					s.src = safeSrc;
					s.async = true;
					s.defer = true;
					s.setAttribute('data-ktm-src', safeSrc);
					s.addEventListener('load', () => {
						s.setAttribute('data-ktm-loaded', '1');
						resolve();
					}, { once: true });
					s.addEventListener('error', () => reject(new Error(`Failed to load ${safeSrc}`)), { once: true });
					document.head.appendChild(s);
				} catch (err) {
					reject(err);
				}
			});

			const hasXlsx = () => Boolean(window?.XLSX && typeof window.XLSX.read === 'function');

			const ensureXlsxMain = async () => {
				if (hasXlsx()) {
					setXlsxStatus('ready');
					return true;
				}

				if (xlsxLoadPromiseRef.current) return xlsxLoadPromiseRef.current;

				const sources = [
					'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
					'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
					'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
				];

				const waitForXlsx = async (timeoutMs) => {
					const started = Date.now();
					while (Date.now() - started < timeoutMs) {
						if (hasXlsx()) return true;
						await new Promise((r) => setTimeout(r, 50));
					}
					return hasXlsx();
				};

				setXlsxStatus('loading');

				xlsxLoadPromiseRef.current = (async () => {
					try {
						for (const src of sources) {
							try {
								await loadScriptOnce(src);
								const ok = await waitForXlsx(1500);
								if (ok) {
									setXlsxStatus('ready');
									return true;
								}
							} catch {
								// try next
							}
						}
						setXlsxStatus('failed');
						return false;
					} finally {
						xlsxLoadPromiseRef.current = null;
					}
				})();

				return xlsxLoadPromiseRef.current;
			};

			useEffect(() => {
				if (hasXlsx()) {
					setXlsxStatus('ready');
					return;
				}
				ensureXlsxMain();
			}, []);

			const normalizeWhitespace = (s) => {
				const out = [];
				const parts = String(s ?? '').split(/\s+/g);
				for (const p of parts) {
					const t = String(p || '').trim();
					if (t) out.push(t);
				}
				return out.join(' ').replace(/\s+/g, ' ').trim();
			};

			const stripDiacritics = (s) => {
				try {
					return String(s ?? '')
						.normalize('NFD')
						.replace(/[\u0300-\u036f]/g, '')
						.replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'));
				} catch {
					return String(s ?? '').replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'));
				}
			};

			const normalizeLoose = (value) => {
				const s0 = normalizeWhitespace(String(value ?? ''));
				if (!s0) return '';
				return stripDiacritics(s0)
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, ' ')
					.replace(/\s+/g, ' ')
					.trim();
			};

			const normalizeProductForMatch = (value) => {
				const s = normalizeLoose(value);
				if (!s) return '';
				return s
					.replace(/\b(combo|set|sp|san\s*pham|sanpham|hang|ship|freeship|free\s*ship)\b/g, ' ')
					.replace(/\s+/g, ' ')
					.trim();
			};

			const parseExcelDateToMonthKey = (cell) => {
				if (cell == null || cell === '') return '';
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
				const m = s.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})$/);
				if (m) {
					const mm = String(Number(m[2]) || 0).padStart(2, '0');
					return `${m[3]}-${mm}`;
				}

				const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
				if (iso) return `${iso[1]}-${iso[2]}`;
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
				try {
					const n = window.KTM.money.parseMoney(s0);
					if (Number.isFinite(n) && n > 0) return Math.trunc(n);
				} catch {
					// ignore
				}

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

				if (digits.startsWith('840')) {
					digits = `0${digits.slice(3)}`;
				} else if (digits.startsWith('84')) {
					if (digits.length === 11) digits = `0${digits.slice(2)}`;
					else if (digits.length === 12 && digits[2] !== '0') digits = `0${digits.slice(2)}`;
				}

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

				let cleaned = text;
				if (best.raw && text.includes(best.raw)) {
					cleaned = cleaned.replace(best.raw, ' ');
				} else {
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
					if (!window?.XLSX?.read) {
						try { await ensureXlsxMain(); } catch {}
					}
					if (!window?.XLSX?.read) throw new Error('Thiếu thư viện đọc Excel (XLSX). Vui lòng tải lại trang admin.');
					const wb = window.XLSX.read(buf, { type: 'array' });
					const sheetName = wb?.SheetNames?.[0];
					const ws = sheetName ? wb.Sheets[sheetName] : null;
					if (!ws) throw new Error('Không đọc được sheet trong file');
					return window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
				}

				const workerCode = `
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
				if (!rows.length) throw new Error('File rỗng');

				const want = {
					product: ['ten san pham', 'tensanpham', 'san pham', 'tên sản phẩm'],
					cod: ['tong tien thu ho', 'tổng tiền thu hộ', 'thu ho', 'thu hộ', 'tong thu ho', 'tổng thu hộ'],
					date: ['ngay', 'ngày', 'date'],
					phone: ['sdt', 'sđt', 'so dien thoai', 'số điện thoại', 'dien thoai', 'điện thoại', 'phone'],
					qty: ['sl', 'so luong', 'số lượng', 'qty', 'quantity'],
				};