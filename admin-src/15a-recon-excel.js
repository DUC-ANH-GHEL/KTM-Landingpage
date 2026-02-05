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
						if (codCol >= 0) {
							const dateCol = findCol(want.date);
							const phoneCol = findCol(want.phone);
							const qtyCol = findCol(want.qty);
							return { headerRow: r, productCol, codCol, dateCol, phoneCol, qtyCol };
						}
					}
					return null;
				};

				const hdr = findHeaderRow();
				if (!hdr) throw new Error('Không tìm thấy header cột "Tổng tiền thu hộ"');

				const out = [];
				const monthKeys = new Set();
				const stripLeadingQtyFromText = (text) => {
					const s = String(text ?? '').trim();
					if (!s) return { text: '', qty: null };
					// Common patterns: "2 gật gù", "2x gật gù", "x2 gật gù"
					let m = s.match(/^\s*x\s*(\d{1,3})\s+(.+)$/i);
					if (m) return { text: String(m[2] || '').trim(), qty: Number(m[1]) };
					m = s.match(/^\s*(\d{1,3})\s*(?:x|\*|×)?\s+(.+)$/i);
					if (m) return { text: String(m[2] || '').trim(), qty: Number(m[1]) };
					return { text: s, qty: null };
				};

				for (let r = hdr.headerRow + 1; r < rows.length; r++) {
					const row = Array.isArray(rows[r]) ? rows[r] : [];
					const productRaw0 = hdr.productCol >= 0 ? String(row[hdr.productCol] ?? '').trim() : '';
					const stripped = stripLeadingQtyFromText(productRaw0);
					const productRaw = stripped.text;
					const codRaw = parseExcelMoney(row[hdr.codCol]);
					const qtyCell = hdr.qtyCol >= 0 ? row[hdr.qtyCol] : '';
					const qtyInfo = (() => {
						if (qtyCell != null && qtyCell !== '') {
							if (typeof qtyCell === 'number' && Number.isFinite(qtyCell)) return { qty: Math.max(1, Math.trunc(qtyCell)), source: 'cell' };
							const s = String(qtyCell).trim();
							const n = Number(s.replace(/[^0-9]/g, ''));
							if (Number.isFinite(n) && n > 0) return { qty: Math.max(1, Math.trunc(n)), source: 'cell' };
						}
						const q2 = Number(stripped.qty);
						if (Number.isFinite(q2) && q2 > 1) return { qty: Math.max(1, Math.trunc(q2)), source: 'text' };
						return { qty: 1, source: 'default' };
					})();
					const qty = qtyInfo.qty;
					const qtySource = qtyInfo.source;

					// Only apply codAlt when quantity comes from an explicit column.
					// If quantity is inferred from text, Excel COD is very likely already the total.
					const codAlt = (qtySource === 'cell' && qty > 1 && codRaw > 0 && qty <= 50) ? (codRaw * qty) : 0;
					const codCandidates = Array.from(new Set([codRaw, codAlt].filter((x) => Number(x || 0) > 0)));
					const cod = codRaw;
					if (!productRaw && !cod) continue;

					const phoneCell = hdr.phoneCol >= 0 ? String(row[hdr.phoneCol] ?? '').trim() : '';
					const phoneFromCell = normalizePhoneDigits(phoneCell);
					let phoneParsed = extractPhoneFromText(productRaw);
					if (phoneFromCell) {
						phoneParsed = { ...phoneParsed, phone: phoneFromCell, phoneNorm: phoneFromCell };
					}
					if (!phoneParsed.phoneNorm) {
						const rowJoined = row.map((c) => String(c ?? '')).join(' | ');
						const p2 = extractPhoneFromText(rowJoined);
						if (p2.phoneNorm) phoneParsed = { ...phoneParsed, phone: p2.phone, phoneNorm: p2.phoneNorm };
					}
					const product = phoneParsed.cleanedText || productRaw || '';

					const productN = normalizeLoose(product);
					if (productN && (productN.includes('tong tien') || productN.includes('tong') || productN.includes('thanh toan') || productN.includes('thanh toán'))) {
						continue;
					}

					const rawDate = hdr.dateCol >= 0 ? row[hdr.dateCol] : '';
					const mk = rawDate ? parseExcelDateToMonthKey(rawDate) : '';
					if (mk) monthKeys.add(mk);
					const dk = rawDate ? parseExcelDateToDayKey(rawDate) : '';

					out.push({
						rowIndex: r + 1,
						dateRaw: rawDate,
						monthKey: mk,
						dayKey: dk,
						product,
						productNorm: normalizeProductForMatch(product),
						productCompact: normalizeProductForMatch(product).replace(/\s+/g, ''),
						phone: phoneParsed.phone,
						phoneNorm: phoneParsed.phoneNorm,
						cod,
						codRaw,
						qty,
						qtySource,
						codAlt,
						codCandidates,
					});
				}

				return { rows: out, monthKeys: Array.from(monthKeys.values()).sort() };
			};

			const buildExcelGroups = (excelRows) => {
				const buckets = new Map();

				const pushToBucket = (key, row) => {
					const cur = buckets.get(key) || { key, rows: [], phoneNorm: '', phone: '', monthKey: '', dayKey: '' };
					cur.rows.push(row);
					if (!cur.phoneNorm && row.phoneNorm) {
						cur.phoneNorm = row.phoneNorm;
						cur.phone = row.phone || row.phoneNorm;
					}
					if (!cur.monthKey && row.monthKey) cur.monthKey = row.monthKey;
					if (!cur.dayKey && row.dayKey) cur.dayKey = row.dayKey;
					buckets.set(key, cur);
				};

				for (const row of (Array.isArray(excelRows) ? excelRows : [])) {
					const p = String(row?.phoneNorm || '').trim();
					const dayKey = String(row?.dayKey || '').trim();
					const monthKey = String(row?.monthKey || '').trim();
					if (p) {
						const k = dayKey ? `p:${p}:d:${dayKey}` : (monthKey ? `p:${p}:m:${monthKey}` : `p:${p}`);
						pushToBucket(k, row);
					} else {
						pushToBucket(`r:${row?.rowIndex}`, row);
					}
				}

				const rowCodBest = (r) => {
					const c = Number(r?.cod || 0) || 0;
					if (c > 0) return c;
					const alt = Number(r?.codAlt || 0) || 0;
					if (alt > 0) return alt;
					return 0;
				};

				const splitBucketIntoGroups = (b) => {
					const rs = (b?.rows || []).slice().filter(Boolean);
					if (rs.length <= 1) return [{ key: b.key, rows: rs, phoneNorm: b.phoneNorm, phone: b.phone, monthKey: b.monthKey }];

					const totals = rs.map(rowCodBest).filter((n) => n > 0);
					const distinctTotals = Array.from(new Set(totals));

					if (b.phoneNorm && b.dayKey && distinctTotals.length > 1 && distinctTotals.length <= 8) {
						const groupsByTotal = new Map();
						for (const t of distinctTotals) {
							groupsByTotal.set(String(t), { key: `${b.key}:t:${t}`, rows: [], phoneNorm: b.phoneNorm, phone: b.phone, monthKey: b.monthKey });
						}

						const zeroRows = [];
						for (const r of rs) {
							const t = rowCodBest(r);
							if (t > 0) {
								groupsByTotal.get(String(t)).rows.push(r);
							} else {
								zeroRows.push(r);
							}
						}

						if (zeroRows.length) {
							const seeds = Array.from(groupsByTotal.values()).map((g) => {
								const seedRow = g.rows.find((x) => String(x?.productNorm || '').trim()) || null;
								return { group: g, seedNorm: String(seedRow?.productNorm || '') };
							});

							for (const r of zeroRows) {
								const pn = String(r?.productNorm || '');
								let best = null;
								let bestScore = -1;
								for (const s of seeds) {
									const sc = similarityScore(pn, s.seedNorm);
									if (sc > bestScore) { bestScore = sc; best = s.group; }
								}
								(best || seeds[0]?.group).rows.push(r);
							}
						}

						return Array.from(groupsByTotal.values()).filter((g) => g.rows.length > 0);
					}

					return [{ key: b.key, rows: rs, phoneNorm: b.phoneNorm, phone: b.phone, monthKey: b.monthKey }];
				};

				const preGroups = [];
				for (const b of buckets.values()) {
					preGroups.push(...splitBucketIntoGroups(b));
				}

				const computeGroup = (g) => {
					const rs = g.rows.slice().filter(Boolean);
					const rowIndices = rs.map((x) => x.rowIndex).filter(Boolean);
					const productParts = [];
					const productPartSet = new Set();
					for (const r of rs) {
						const pn = String(r?.productNorm || '').trim();
						if (!pn) continue;
						if (productPartSet.has(pn)) continue;
						productPartSet.add(pn);
						productParts.push(String(r?.product || '').trim());
					}
					const productDisplay = productParts.filter(Boolean).join(' + ');
					const productNorm = normalizeLoose(productDisplay);

					const codCandidatesAll = [];
					for (const r of rs) {
						const cands = Array.isArray(r?.codCandidates) ? r.codCandidates : [];
						for (const c of cands) {
							const n = Number(c || 0) || 0;
							if (n > 0) codCandidatesAll.push(n);
						}
					}
					const codCandidates = Array.from(new Set(codCandidatesAll)).sort((a, b) => a - b);

					const codValues = rs.map((r) => rowCodBest(r)).filter((n) => n > 0);
					let cod = 0;
					if (!codValues.length) cod = 0;
					else {
						const freq = new Map();
						for (const v of codValues) freq.set(v, (freq.get(v) || 0) + 1);
						const distinct = Array.from(freq.keys());
						if (distinct.length === 1) {
							cod = distinct[0];
						} else {
							let bestRepeat = null;
							let bestCount = 0;
							for (const [v, c] of freq.entries()) {
								if (c > bestCount) {
									bestCount = c;
									bestRepeat = v;
								}
							}
							if (bestRepeat != null && bestCount >= 2) {
								cod = bestRepeat;
							} else {
								cod = codValues.reduce((s, n) => s + n, 0);
							}
						}
					}

					const monthKey = g.monthKey || (rs.find((x) => x?.monthKey)?.monthKey || '');
					const dayKey = rs.find((x) => x?.dayKey)?.dayKey || '';
					const dateRaw = rs.find((x) => x?.dateRaw)?.dateRaw || '';

					return {
						key: g.key,
						phoneNorm: g.phoneNorm || '',
						phone: g.phone || g.phoneNorm || '',
						monthKey,
						dayKey,
						dateRaw,
						rowIndices,
						rowIndexFirst: rowIndices.length ? Math.min(...rowIndices) : null,
						rowCount: rs.length,
						productDisplay,
						productNorm,
						productCompact: String(productNorm || '').replace(/\s+/g, ''),
						cod,
						codCandidates,
						rows: rs,
					};
				};

				return preGroups.map(computeGroup);
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

				const TTL_MS = 5 * 60 * 1000;

				for (let i = 0; i < keys.length; i++) {
					const mk = keys[i];
					const cached = ordersCacheRef.current?.get(mk);
					if (cached && (Date.now() - Number(cached.at || 0) < TTL_MS) && Array.isArray(cached.records)) {
						ordersAll.push(...cached.records);
						continue;
					}

					setReconProgress(`Đang tải đơn hệ thống tháng ${mk} (${i + 1}/${keys.length})...`);
					const list = await fetchOrdersForMonth(mk);
					ordersCacheRef.current?.set(mk, { at: Date.now(), records: list });
					ordersAll.push(...list);
				}

				const normalizeStatus = (s) => String(s || '').trim().toLowerCase();
				const filtered = ordersAll.filter((o) => {
					const st = normalizeStatus(o?.status);
					if (reconExcludeDraft && st === 'draft') return false;
					if (reconExcludeCanceled && st === 'canceled') return false;
					if (reconExcludePaid && st === 'paid') return false;
					return true;
				});

				const pickDateField = (o) => {
					const basis = String(reconDateBasis || 'created_at');
					if (basis === 'updated_at') return o?.updated_at ?? o?.created_at ?? null;
					return o?.created_at ?? null;
				};

				const records = filtered.map((o) => {
					const productSummary = window.KTM.orders.getOrderProductSummary(o, getProductByIdForRecon);
					const cod = window.KTM.orders.getOrderTotalMoney(o, getProductByIdForRecon);
					const productNorm = normalizeProductForMatch(productSummary);
					const phoneNorm = normalizePhoneDigits(o?.phone ?? '');
					const dt = pickDateField(o);
					const dayKey = (() => {
						if (!dt) return '';
						const d = new Date(dt);
						if (Number.isNaN(d.getTime())) return '';
						return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
					})();
					return {
						id: String(o?.id ?? ''),
						created_at: o?.created_at ?? null,
						updated_at: o?.updated_at ?? null,
						dayKey,
						status: String(o?.status ?? ''),
						phone: String(o?.phone ?? ''),
						phoneNorm,
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
				if (aCompact && bCompact && aCompact === bCompact) return 1;
				if (aCompact && bCompact && (bCompact.includes(aCompact) || aCompact.includes(bCompact))) return 0.92;

				const tokenize = (s) => {
					const raw = String(s || '')
						.replace(/[\+]/g, ' ')
						.replace(/[()\[\]{},.;:!?]/g, ' ')
						.replace(/\s+/g, ' ')
						.trim();
					const toks = raw.split(' ').map((t) => t.trim()).filter(Boolean);
					return toks
						.map((t) => t.replace(/[^a-z0-9]/g, ''))
						.filter(Boolean)
						.filter((t) => t.length > 1);
				};

				const aToks = tokenize(a);
				const bToks = tokenize(b);
				if (!aToks.length || !bToks.length) return 0;

				const bSet = new Set(bToks);

				const edit1 = (x, y) => {
					if (x === y) return 0;
					const lx = x.length;
					const ly = y.length;
					if (Math.abs(lx - ly) > 1) return 2;
					let i = 0;
					let j = 0;
					let diff = 0;
					while (i < lx && j < ly) {
						if (x[i] === y[j]) { i += 1; j += 1; continue; }
						diff += 1;
						if (diff > 1) return diff;
						if (lx > ly) i += 1;
						else if (ly > lx) j += 1;
						else { i += 1; j += 1; }
					}
					if (i < lx || j < ly) diff += 1;
					return diff;
				};

				const weightOf = (t) => (/[0-9]/.test(t) ? 2 : 1);
				let matchedW = 0;
				let totalW = 0;

				for (const t of aToks) {
					const w = weightOf(t);
					totalW += w;
					if (bSet.has(t) || (bCompact && bCompact.includes(t))) {
						matchedW += w;
						continue;
					}
					if (t.length >= 4) {
						let ok = false;
						for (const bt of bToks) {
							if (bt === t) { ok = true; break; }
							if (bt.includes(t) || t.includes(bt)) { ok = true; break; }
							if (bCompact && bCompact.includes(t)) { ok = true; break; }
							if (edit1(t, bt) <= 1) { ok = true; break; }
						}
						if (ok) matchedW += w * 0.8;
					}
				}

				const base = matchedW / Math.max(1, totalW);
				const lenPenalty = Math.min(0.12, Math.abs(a.length - b.length) / Math.max(1, Math.max(a.length, b.length)));
				const numTokenBonus = (() => {
					const numsA = aToks.filter((t) => /[0-9]/.test(t) && t.length >= 3);
					if (!numsA.length) return 0;
					let hit = 0;
					for (const t of numsA) {
						if (bSet.has(t) || (bCompact && bCompact.includes(t))) hit += 1;
					}
					return Math.min(0.08, 0.04 * hit);
				})();

				return Math.max(0, Math.min(1, base - lenPenalty + numTokenBonus));
			};

			const dayKeyToTime = (dk) => {
				const s = String(dk || '').trim();
				const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
				if (!m) return null;
				const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
				if (Number.isNaN(d.getTime())) return null;
				return d.getTime();
			};

			const codDiffInfo = (group, order) => {
				const gCands = Array.isArray(group?.codCandidates) && group.codCandidates.length ? group.codCandidates : [Number(group?.cod || 0) || 0];
				const oCod = Number(order?.cod || 0) || 0;
				let bestDiff = Infinity;
				let bestCand = 0;
				for (const c of gCands) {
					const n = Number(c || 0) || 0;
					if (n <= 0) continue;
					const diff = Math.abs(oCod - n);
					if (diff < bestDiff) {
						bestDiff = diff;
						bestCand = n;
					}
				}
				if (!Number.isFinite(bestDiff)) bestDiff = Infinity;
				return { bestDiff, bestCand, oCod };
			};

			const scoreCandidate = (group, order, options) => {
				const phoneKey = String(group?.phoneNorm || '').trim();
				const phoneMatch = Boolean(phoneKey && String(order?.phoneNorm || '') === phoneKey);

				const tol = Math.max(0, Number(options?.codTolerance || 0) || 0);
				const { bestDiff, bestCand } = codDiffInfo(group, order);
				const codExact = bestDiff === 0;
				const codWithin = Number.isFinite(bestDiff) && tol > 0 && bestDiff > 0 && bestDiff <= tol;

				const gDay = String(group?.dayKey || '').trim();
				const oDay = String(order?.dayKey || '').trim();
				const dayExact = Boolean(gDay && oDay && gDay === oDay);
				const dayNear = (() => {
					if (!gDay || !oDay) return false;
					const t1 = dayKeyToTime(gDay);
					const t2 = dayKeyToTime(oDay);
					if (t1 == null || t2 == null) return false;
					const dd = Math.abs(t1 - t2) / (24 * 60 * 60 * 1000);
					return dd > 0 && dd <= 1.01;
				})();

				// NOTE: Product-name similarity must NOT be used for matching.
				const hasPhone = Boolean(phoneKey);
				const weights = hasPhone
					? { phone: 0.65, cod: 0.27, day: 0.08 }
					: { phone: 0, cod: 0.85, day: 0.15 };

				const phoneScore = phoneMatch ? weights.phone : 0;
				const codScore = codExact ? weights.cod : (codWithin ? weights.cod * (1 - (bestDiff / Math.max(1, tol))) : 0);
				const dayScore = dayExact ? weights.day : (dayNear ? weights.day * 0.6 : 0);
				const score = phoneScore + codScore + dayScore;
				const reasons = [];
				if (phoneMatch) reasons.push('SĐT trùng');
				if (codExact) reasons.push('COD trùng');
				else if (codWithin) reasons.push(`COD lệch ${window.KTM.money.formatNumber(bestDiff)} (<= ${window.KTM.money.formatNumber(tol)})`);
				else if (bestCand > 0 && Number.isFinite(bestDiff) && bestDiff !== Infinity) reasons.push(`COD lệch ${window.KTM.money.formatNumber(bestDiff)}`);
				if (dayExact) reasons.push('Cùng ngày');
				else if (dayNear) reasons.push('Ngày gần đúng (±1)');
				return { score, reasons, nameSim: null, phoneMatch, codExact, codWithin, codDiff: bestDiff, bestCand };
			};

			const normalizeItemCoreForCompare = (value) => {
				let s = String(value ?? '');
				// Remove leading quantity patterns: "1 ...", "1x ...", "x1 ..."
				s = s.replace(/^\s*(?:x\s*)?(\d{1,3})\s*(?:x|\*|×)?\s*/i, ' ');
				s = s.replace(/\s+/g, ' ').trim();
				return normalizeProductForMatch(s);
			};

			const buildExcelItemsMap = (group) => {
				const qtyByKey = new Map();
				const labelByKey = new Map();
				const rows = Array.isArray(group?.rows) ? group.rows : [];
				const qtyReliable = rows.length > 1 || rows.some((r) => String(r?.qtySource || 'default') !== 'default');
				for (const r of rows) {
					const rawName = String(r?.product || '').trim();
					const key = normalizeItemCoreForCompare(rawName);
					if (!key) continue;
					const q0 = Math.max(1, Number(r?.qty ?? 1) || 1);
					const q = qtyReliable ? q0 : 1;
					qtyByKey.set(key, (qtyByKey.get(key) || 0) + q);
					if (!labelByKey.has(key)) labelByKey.set(key, rawName);
				}
				return { qtyByKey, labelByKey, qtyReliable };
			};

			const buildSystemItemsMap = (order) => {
				const qtyByKey = new Map();
				const labelByKey = new Map();
				const raw = order?.raw || null;
				const items = Array.isArray(raw?.items) ? raw.items : [];
				if (items.length) {
					for (const it of items) {
						const pid = it?.product_id;
						const product = pid ? getProductByIdForRecon(pid) : null;
						const baseName = String(product?.name || it?.product_name || '').trim();
						const variant = String(it?.variant || '').trim();
						const label = (baseName ? baseName : (order?.productSummary || '')).trim() + (variant ? ` (${variant})` : '');
						const key = normalizeItemCoreForCompare(label);
						if (!key) continue;
						const q = Math.max(1, Number(it?.quantity ?? 1) || 1);
						qtyByKey.set(key, (qtyByKey.get(key) || 0) + q);
						if (!labelByKey.has(key)) labelByKey.set(key, baseName || label);
					}
					return { qtyByKey, labelByKey };
				}

				// Fallback: parse from productSummary string "A x1 + B x2"
				const summary = String(order?.productSummary || '').trim();
				if (!summary) return { qtyByKey, labelByKey };
				const parts = summary.split('+').map((p) => String(p || '').trim()).filter(Boolean);
				for (const p of parts) {
					const m = p.match(/\bx\s*(\d{1,3})\b/i);
					const q = m ? Math.max(1, Number(m[1]) || 1) : 1;
					const nameOnly = p.replace(/\bx\s*\d{1,3}\b/ig, ' ').replace(/\s+/g, ' ').trim();
					const key = normalizeItemCoreForCompare(nameOnly);
					if (!key) continue;
					qtyByKey.set(key, (qtyByKey.get(key) || 0) + q);
					if (!labelByKey.has(key)) labelByKey.set(key, nameOnly);
				}
				return { qtyByKey, labelByKey };
			};

			const diffItems = (excelGroup, order) => {
				const ex = buildExcelItemsMap(excelGroup);
				const sy = buildSystemItemsMap(order);

				const exKeys = Array.from(ex.qtyByKey.keys());
				const syKeys = Array.from(sy.qtyByKey.keys());

				// Fuzzy match keys to reduce false diffs due to naming/variants.
				const pairs = [];
				for (const ek of exKeys) {
					for (const sk of syKeys) {
						const sc = similarityScore(ek, sk);
						if (sc >= 0.90) pairs.push({ ek, sk, sc });
					}
				}
				pairs.sort((a, b) => b.sc - a.sc);
				const exToSy = new Map();
				const usedEx = new Set();
				const usedSy = new Set();
				for (const p of pairs) {
					if (usedEx.has(p.ek) || usedSy.has(p.sk)) continue;
					exToSy.set(p.ek, p.sk);
					usedEx.add(p.ek);
					usedSy.add(p.sk);
				}

				const missingInSystem = [];
				const missingInExcel = [];

				for (const [k, q] of ex.qtyByKey.entries()) {
					const kk = exToSy.get(k) || k;
					const sq = sy.qtyByKey.get(kk) || 0;
					if (sq < q) {
						missingInSystem.push({ name: ex.labelByKey.get(k) || k, qty: q - sq });
					}
				}
				for (const [k, q] of sy.qtyByKey.entries()) {
					// Find exact or fuzzy-mapped excel key that points to this system key.
					let eq = ex.qtyByKey.get(k) || 0;
					if (!eq) {
						for (const [ek, sk] of exToSy.entries()) {
							if (sk === k) {
								eq = ex.qtyByKey.get(ek) || 0;
								break;
							}
						}
					}
					if (eq < q) {
						missingInExcel.push({ name: sy.labelByKey.get(k) || k, qty: q - eq });
					}
				}

				const hasDiff = missingInSystem.length > 0 || missingInExcel.length > 0;
				return { hasDiff, missingInSystem, missingInExcel };
			};

			const itemDiffToReason = (d) => {
				if (!d?.hasDiff) return '';
				const fmtList = (arr) => arr.slice(0, 4).map((x) => `${x.name} x${x.qty}`).join(', ') + (arr.length > 4 ? ` (+${arr.length - 4})` : '');
				const parts = [];
				if (Array.isArray(d.missingInExcel) && d.missingInExcel.length) parts.push(`Thiếu trong Excel: ${fmtList(d.missingInExcel)}`);
				if (Array.isArray(d.missingInSystem) && d.missingInSystem.length) parts.push(`Thiếu trong hệ thống: ${fmtList(d.missingInSystem)}`);
				return parts.join(' · ');
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
					const allExcelRows = Array.isArray(parsed.rows) ? parsed.rows : [];
					const curMonthKey = String(month || '').trim() || getCurrentMonth();
					const monthKeyToIndex = (mk) => {
						const m = String(mk || '').match(/^(\d{4})-(\d{2})$/);
						if (!m) return NaN;
						const y = Number(m[1]);
						const mo = Number(m[2]);
						if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return NaN;
						return (y * 12) + (mo - 1);
					};
					const indexToMonthKey = (idx) => {
						if (!Number.isFinite(idx)) return '';
						const y = Math.floor(idx / 12);
						const mo = (idx % 12) + 1;
						if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return '';
						return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}`;
					};
					const curIdx = monthKeyToIndex(curMonthKey);
					const minIdx = Number.isFinite(curIdx) ? (curIdx - 2) : NaN;
					const isIn3MonthWindow = (mk) => {
						const idx = monthKeyToIndex(mk);
						if (!Number.isFinite(idx) || !Number.isFinite(curIdx) || !Number.isFinite(minIdx)) return false;
						return idx >= minIdx && idx <= curIdx;
					};
					const windowMonthKeys = (() => {
						if (!Number.isFinite(curIdx) || !Number.isFinite(minIdx)) return [curMonthKey];
						const arr = [];
						for (let idx = minIdx; idx <= curIdx; idx++) {
							const mk = indexToMonthKey(idx);
							if (mk) arr.push(mk);
						}
						return arr.length ? arr : [curMonthKey];
					})();

					const inWindowRows = allExcelRows.filter((r) => {
						const mk = String(r?.monthKey || '').trim();
						if (!mk) return true; // treat missing date as current month (user-selected month)
						return isIn3MonthWindow(mk);
					});
					const outOfWindowRows = allExcelRows.filter((r) => {
						const mk = String(r?.monthKey || '').trim();
						if (!mk) return false;
						return !isIn3MonthWindow(mk);
					});

					if (!inWindowRows.length) {
						throw new Error(`File không có dữ liệu trong 3 tháng gần nhất quanh ${curMonthKey}.`);
					}

					const monthKeys = windowMonthKeys;

					// Fetch system orders only for the 3-month window (based on selected month).
					const sysOrders = await buildSystemOrderRecords(monthKeys);

					// Count system orders per phone+day to allow a safe merge of multiple Excel rows
					// into a single group only when the system has exactly one order on that day.
					const sysCountByPhoneDay = (() => {
						const map = new Map();
						for (const o of (Array.isArray(sysOrders) ? sysOrders : [])) {
							const p = String(o?.phoneNorm || '').trim();
							const d = String(o?.dayKey || '').trim();
							if (!p || !d) continue;
							const k = `${p}|${d}`;
							map.set(k, (map.get(k) || 0) + 1);
						}
						return map;
					})();

					// Build helper keys for matching and for hinting when Excel has a likely row
					// but its date is outside the 3-month window.
					const toNum = (v) => {
						const n = Number(v);
						return Number.isFinite(n) ? Math.trunc(n) : 0;
					};
					const makeKey = (phoneNorm, cod) => {
						const p = String(phoneNorm || '').trim();
						const c = toNum(cod);
						if (!p || !c) return '';
						return `${p}|${c}`;
					};
					const sysCountByKey = (() => {
						const map = new Map();
						for (const o of (Array.isArray(sysOrders) ? sysOrders : [])) {
							const k = makeKey(o?.phoneNorm, o?.cod);
							if (!k) continue;
							map.set(k, (map.get(k) || 0) + 1);
						}
						return map;
					})();
					const sysKeySet = new Set(sysOrders.map((o) => makeKey(o?.phoneNorm, o?.cod)).filter(Boolean));
					const outsideHintsByKey = (() => {
						const map = new Map();
						for (const r of outOfWindowRows) {
							const k = makeKey(r?.phoneNorm, r?.cod);
							if (!k || !sysKeySet.has(k)) continue;
							const list = map.get(k) || [];
							list.push({
								rowIndex: r?.rowIndex ?? null,
								dateRaw: r?.dateRaw ?? '',
								monthKey: r?.monthKey ?? '',
								dayKey: r?.dayKey ?? '',
								product: r?.product ?? '',
							});
							map.set(k, list);
						}
						return map;
					})();
					const excelRows = inWindowRows;

					const rowCodBest = (r) => {
						const c = Number(r?.cod || 0) || 0;
						if (c > 0) return c;
						const alt = Number(r?.codAlt || 0) || 0;
						if (alt > 0) return alt;
						return 0;
					};

					const buildMergedExcelGroups = (rows) => {
						const buckets = new Map();
						for (const r of (Array.isArray(rows) ? rows : [])) {
							const p = String(r?.phoneNorm || '').trim();
							const d = String(r?.dayKey || '').trim();
							if (!p || !d) continue;
							const k = `${p}|${d}`;
							const list = buckets.get(k) || [];
							list.push(r);
							buckets.set(k, list);
						}

						const out = [];
						for (const [k, list] of buckets.entries()) {
							if (!Array.isArray(list) || list.length < 2) continue;
							const [p, dayKey] = String(k).split('|');
							const monthKey = dayKey && dayKey.length >= 7 ? dayKey.slice(0, 7) : '';
							const cod = list.map(rowCodBest).filter((n) => n > 0).reduce((s, n) => s + n, 0);
							if (!cod) continue;

							const rowIndices = list.map((x) => x?.rowIndex).filter(Boolean);
							const productParts = [];
							const seen = new Set();
							for (const r of list) {
								const t = String(r?.product || '').trim();
								if (!t) continue;
								if (seen.has(t)) continue;
								seen.add(t);
								productParts.push(t);
							}

							out.push({
								key: `merge:p:${p}:d:${dayKey}`,
								isMerged: true,
								phoneNorm: p,
								phone: p,
								monthKey,
								dayKey,
								dateRaw: list.find((x) => x?.dateRaw)?.dateRaw || '',
								rowIndices,
								rowIndexFirst: rowIndices.length ? Math.min(...rowIndices) : null,
								rowCount: list.length,
								productDisplay: productParts.join(' + '),
								productNorm: '',
								productCompact: '',
								cod,
								codCandidates: [],
								rows: list,
							});
						}
						return out;
					};

					const excelGroupsBase = buildExcelGroups(excelRows);
					const excelGroupsMerged = buildMergedExcelGroups(excelRows);
					const excelGroups = excelGroupsMerged.length
						? excelGroupsBase.concat(excelGroupsMerged)
						: excelGroupsBase;
					setReconProgress(`Đọc được ${excelRows.length} dòng (${excelGroupsBase.length} cụm; +${excelGroupsMerged.length} cụm gộp) trong 3 tháng gần nhất. Đang chuẩn bị đối soát...`);
					setReconProgress(`Đang đối soát (${excelGroups.length} cụm Excel vs ${sysOrders.length} đơn hệ thống)...`);

					// Match only by: phoneNorm + COD (total collected). No product-name checking.

					const excelByPhone = new Map();
					const excelByKey = new Map();
					const excelByKeyDay = new Map();
					for (const g of excelGroups) {
						const p = String(g.phoneNorm || '').trim();
						if (!p) continue;
						const arr = excelByPhone.get(p) || [];
						arr.push(g);
						excelByPhone.set(p, arr);
						const k = makeKey(p, g.cod);
						if (k) {
							const list = excelByKey.get(k) || [];
							list.push(g);
							excelByKey.set(k, list);
							const dk = String(g?.dayKey || '').trim();
							if (dk) {
								const kd = `${k}|${dk}`;
								const l2 = excelByKeyDay.get(kd) || [];
								l2.push(g);
								excelByKeyDay.set(kd, l2);
							}
						}
					}

					const usedExcelGroupKeys = new Set();
					const excelGroupKeysByRowIndex = (() => {
						const map = new Map();
						for (const g of excelGroups) {
							const key = String(g?.key || '').trim();
							if (!key) continue;
							const idxs = Array.isArray(g?.rowIndices) ? g.rowIndices : [];
							for (const ri of idxs) {
								const r = Number(ri);
								if (!Number.isFinite(r)) continue;
								const list = map.get(r) || [];
								list.push(key);
								map.set(r, list);
							}
						}
						return map;
					})();
					const markUsedGroupAndOverlaps = (g) => {
						const idxs = Array.isArray(g?.rowIndices) ? g.rowIndices : [];
						for (const ri of idxs) {
							const r = Number(ri);
							if (!Number.isFinite(r)) continue;
							const keys = excelGroupKeysByRowIndex.get(r) || [];
							for (const k of keys) usedExcelGroupKeys.add(String(k));
						}
						const selfKey = String(g?.key || '').trim();
						if (selfKey) usedExcelGroupKeys.add(selfKey);
					};
					const matches = [];
					const moneyMismatch = [];
					const systemOnly = [];
					const formatOutsideHint = (hints) => {
						const arr = Array.isArray(hints) ? hints.filter(Boolean) : [];
						if (!arr.length) return '';
						const top = arr.slice(0, 2).map((h) => {
							const d = String(h?.dateRaw || h?.dayKey || h?.monthKey || '').trim();
							const r = h?.rowIndex ? `dòng ${h.rowIndex}` : '';
							return [d, r].filter(Boolean).join(' · ');
						}).join(' | ');
						return `Có dòng Excel ngoài 3 tháng trùng SĐT+COD: ${top}`;
					};

					for (const o of sysOrders) {
						const p = String(o.phoneNorm || '').trim();
						const c = toNum(o.cod);
						if (!p || !c) {
							systemOnly.push(o);
							continue;
						}

						const key = makeKey(p, c);
						const day = String(o.dayKey || '').trim();
						let exactList = key ? (excelByKey.get(key) || []) : [];
						let exactDayList = [];
						if (key && day) {
							exactDayList = excelByKeyDay.get(`${key}|${day}`) || [];
						}
						if (day && exactList.length) {
							// If both sides have a dayKey, avoid consuming an Excel group from a different day
							// (prevents a different system order with same COD stealing the correct Excel group).
							const keyHasMultipleSystemOrders = (sysCountByKey.get(key) || 0) > 1;
							exactList = exactList.filter((g) => {
								const gd = String(g?.dayKey || '').trim();
								if (!gd) return !keyHasMultipleSystemOrders; // ambiguous when multiple system orders share same SĐT+COD
								return gd === day;
							});
						}

						const canUseMergedForOrder = (g) => {
							if (!g?.isMerged) return true;
							const gd = String(g?.dayKey || '').trim();
							if (!day || !gd || gd !== day) return false;
							return (sysCountByPhoneDay.get(`${p}|${day}`) || 0) === 1;
						};

						const pickFromExactList = (list) => {
							const available = (Array.isArray(list) ? list : []).filter((g) => !usedExcelGroupKeys.has(String(g?.key)));
							if (!available.length) return null;
							// Prefer non-merged first, then merged (if allowed)
							let pick = available.find((g) => !g?.isMerged) || null;
							if (!pick) pick = available.find((g) => canUseMergedForOrder(g)) || null;
							if (pick && pick?.isMerged && !canUseMergedForOrder(pick)) return null;
							return pick;
						};

						// 1) Exact match by phone+COD+dayKey
						if (exactDayList.length) {
							const pick = pickFromExactList(exactDayList);
							if (pick) {
								markUsedGroupAndOverlaps(pick);
								matches.push({ group: pick, order: o, score: 1, reasons: ['SĐT trùng', 'COD trùng', 'Cùng ngày'] });
								continue;
							}
						}

						// 2) Exact match by phone+COD (but not cross-day when both sides know the day)
						if (exactList.length) {
							const pick = pickFromExactList(exactList);
							if (pick) {
								markUsedGroupAndOverlaps(pick);
								matches.push({ group: pick, order: o, score: 1, reasons: ['SĐT trùng', 'COD trùng', ...(pick.dayKey && day && pick.dayKey === day ? ['Cùng ngày'] : [])] });
								continue;
							}
						}

						const byPhone = excelByPhone.get(p) || [];
						if (!byPhone.length) {
							const hints = outsideHintsByKey.get(key) || [];
							systemOnly.push(hints.length ? { ...o, excelOutsideHints: hints, excelOutsideHintText: formatOutsideHint(hints) } : o);
							continue;
						}

						// Same phone exists in Excel but COD differs => money mismatch.
						let pool = byPhone.filter((g) => !usedExcelGroupKeys.has(String(g?.key)));
						if (day) {
							const sameDay = pool.filter((g) => String(g.dayKey || '').trim() === day);
							if (sameDay.length) pool = sameDay;
						}
						if (!pool.length) {
							const hints = outsideHintsByKey.get(key) || [];
							systemOnly.push(hints.length ? { ...o, excelOutsideHints: hints, excelOutsideHintText: formatOutsideHint(hints) } : o);
							continue;
						}
						let best = null;
						let bestAbs = Number.POSITIVE_INFINITY;
						for (const g of pool) {
							const gc = toNum(g.cod);
							if (!gc) continue;
							const abs = Math.abs(gc - c);
							if (abs < bestAbs) { bestAbs = abs; best = g; }
						}
						if (!best) {
							const hints = outsideHintsByKey.get(key) || [];
							systemOnly.push(hints.length ? { ...o, excelOutsideHints: hints, excelOutsideHintText: formatOutsideHint(hints) } : o);
							continue;
						}

						const diff = toNum(best.cod) - c;
						const absDiff = Math.abs(diff);
						const tol = reconEnableCodTolerance ? Math.max(0, toNum(reconCodTolerance)) : 0;
						if (absDiff === 0 || (tol > 0 && absDiff <= tol)) {
							markUsedGroupAndOverlaps(best);
							matches.push({
								group: best,
								order: o,
								score: 1,
								reasons: ['SĐT trùng', 'COD trùng', ...(tol > 0 && absDiff > 0 ? [`Trong ngưỡng ±${tol}`] : []), ...(day && String(best.dayKey || '').trim() === day ? ['Cùng ngày'] : [])],
							});
							continue;
						}

						moneyMismatch.push({
							group: best,
							order: o,
							score: 0,
							diff,
							reason: day && String(best.dayKey || '').trim() === day ? 'SĐT trùng · Cùng ngày' : 'SĐT trùng',
							suggestions: pool.slice(0, 3).map((g) => ({
								key: g.key,
								cod: toNum(g.cod),
								productSummary: String(g.product || '').trim(),
								score: 0,
								reasons: ['Excel cùng SĐT'],
							})),
						});
					}

					const ok = systemOnly.length === 0 && moneyMismatch.length === 0;

					setReconResult({
						ok,
						monthKeys,
						excelCount: excelRows.length,
						excelGroupCount: excelGroups.length,
						systemCount: sysOrders.length,
						matches,
						systemOnly,
						moneyMismatch,
					});
					setReconSelectedMatchIds(new Set());
					setReconProgress(ok ? 'OK ✅' : 'Đã đối soát xong');
				} catch (e) {
					setReconError(String(e?.message || e || 'Lỗi đối soát'));
					setReconProgress('');
				} finally {
					setReconRunning(false);
				}
			};

			const buildUpdateStatusPayload = (matchOrder, nextStatus) => {
				const normalizePhone = (v) => String(v || '').replace(/[^0-9]/g, '');
				const raw = matchOrder?.raw || {};
				const orderId = String(matchOrder?.id ?? raw?.id ?? '').trim();
				const phone = normalizePhone(raw?.phone ?? matchOrder?.phone ?? '');
				if (!orderId || !phone) return null;

				const rawItems = Array.isArray(raw?.items) ? raw.items : [];
				let normalizedItems = rawItems
					.map((it) => ({
						product_id: it?.product_id || '',
						quantity: Number(it?.quantity ?? 1),
						variant: String(it?.variant || '').trim() || null,
						variant_json: it?.variant_json ?? null,
						unit_price: (() => {
							const rawPrice = it?.unit_price ?? it?.unitPrice;
							const n = rawPrice == null || rawPrice === '' ? NaN : Number(rawPrice);
							return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
						})(),
					}))
					.filter((it) => it.product_id && Number.isFinite(it.quantity) && it.quantity > 0);

				if (!normalizedItems.length && raw?.product_id) {
					const q = Number(raw?.quantity ?? 1);
					normalizedItems = [{ product_id: raw.product_id, quantity: Number.isFinite(q) && q > 0 ? q : 1, variant: null, variant_json: null, unit_price: null }];
				}

				if (!normalizedItems.length) return null;
				const primary = normalizedItems[0];
				return {
					id: orderId,
					customer_name: String(raw?.customer_name ?? '').trim(),
					phone,
					address: String(raw?.address ?? '').trim(),
					note: String(raw?.note ?? '').trim(),
					adjustment_amount: Number(raw?.adjustment_amount ?? 0) || 0,
					adjustment_note: String(raw?.adjustment_note ?? '').trim(),
					product_id: primary.product_id,
					quantity: primary.quantity,
					status: nextStatus,
					items: normalizedItems,
				};
			};

			const markSelectedMatchesAsPaid = async () => {
				if (!reconResult || reconPayRunning) return;
				const ids = Array.from(reconSelectedMatchIds.values()).map((x) => String(x || '').trim()).filter(Boolean);
				if (!ids.length) return;
				if (!confirm(`Đánh dấu đã nhận tiền cho ${ids.length} đơn?`)) return;

				setReconPayRunning(true);
				setReconPayProgress('Đang cập nhật trạng thái...');
				let okCount = 0;
				const failed = [];
				try {
					for (let i = 0; i < ids.length; i++) {
						const id = ids[i];
						setReconPayProgress(`Đang cập nhật (${i + 1}/${ids.length})...`);
						const match = (Array.isArray(reconResult?.matches) ? reconResult.matches : []).find((m) => String(m?.order?.id || '') === id);
						const payload = buildUpdateStatusPayload(match?.order, 'paid');
						if (!payload) {
							failed.push({ id, error: 'Thiếu dữ liệu (phone/items)' });
							continue;
						}
						try {
							await window.KTM.api.putJSON(`${API_BASE}/api/orders/${encodeURIComponent(id)}`, payload, 'Lỗi cập nhật trạng thái');
							okCount += 1;
						} catch (e) {
							failed.push({ id, error: String(e?.message || e || 'Lỗi') });
						}
					}
				} finally {
					setReconPayRunning(false);
					setReconPayProgress('');
				}

				if (okCount > 0) {
					toast(`Đã cập nhật ${okCount} đơn sang Đã nhận tiền`, 'success');
					const idSet = new Set(ids);
					setReconResult((prev) => {
						if (!prev) return prev;
						const patchOrder = (o) => {
							if (!o || !idSet.has(String(o.id))) return o;
							const raw = o.raw ? { ...o.raw, status: 'paid' } : o.raw;
							return { ...o, status: 'paid', raw };
						};
						return {
							...prev,
							matches: Array.isArray(prev.matches) ? prev.matches.map((m) => ({ ...m, order: patchOrder(m?.order) })) : prev.matches,
							systemOnly: Array.isArray(prev.systemOnly) ? prev.systemOnly.map(patchOrder) : prev.systemOnly,
							moneyMismatch: Array.isArray(prev.moneyMismatch) ? prev.moneyMismatch.map((x) => ({ ...x, order: patchOrder(x?.order) })) : prev.moneyMismatch,
						};
					});
					setReconSelectedMatchIds(new Set());
				}

				if (failed.length) {
					toast(`Có ${failed.length} đơn cập nhật lỗi (xem console)`, 'warning');
					console.warn('Recon paid update failures:', failed);
				}
			};

			return (
				<div className="product-manager pb-5 mb-4">
					<div className="product-header">
						<h5 className="mb-0"><i className="fas fa-file-excel me-2 text-success"></i>Đối soát Excel</h5>
					</div>

					<div className="product-search">
						<div className="row g-2 align-items-end">
							<div className="col-12 col-md-5">
								<label className="form-label mb-1">Tháng mặc định (nếu Excel không có cột ngày)</label>
								<div className="input-group">
									<span className="input-group-text" aria-hidden="true"><i className="fas fa-calendar-alt"></i></span>
									<input
										type="month"
										className="form-control"
										value={currentMonth}
										onChange={(e) => setCurrentMonth(e.target.value)}
										aria-label="Chọn tháng"
										disabled={reconRunning}
									/>
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
													<span className="text-muted small">Đối soát theo: <span className="fw-semibold">SĐT</span> + <span className="fw-semibold">Tổng tiền thu hộ</span></span>
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
													{reconFileName ? `File: ${reconFileName}` : 'Header cần có: "Tổng Tiền Thu Hộ". "Tên sản phẩm" (nếu có) sẽ giúp gợi ý khớp tốt hơn. Có cột "Ngày" thì sẽ tự tải đúng tháng trong file.'}
									</div>
								</div>

								<div className="col-12 col-md-5">
									<div className="d-flex flex-wrap gap-2 justify-content-md-end">
										<div className="d-flex align-items-center gap-2">
											<label className="form-label mb-0 small text-muted">Ngày theo</label>
											<select
												className="form-select form-select-sm"
												style={{ width: 150 }}
												value={reconDateBasis}
												disabled={reconRunning}
												onChange={(e) => setReconDateBasis(e.target.value)}
											>
												<option value="created_at">created_at</option>
												<option value="updated_at">updated_at</option>
											</select>
										</div>

										<div className="form-check">
											<input
												className="form-check-input"
												type="checkbox"
												id="recon-exc-draft"
												checked={reconExcludeDraft}
												disabled={reconRunning}
												onChange={(e) => setReconExcludeDraft(Boolean(e.target.checked))}
											/>
											<label className="form-check-label small" htmlFor="recon-exc-draft">Bỏ nháp</label>
										</div>

										<div className="form-check">
											<input
												className="form-check-input"
												type="checkbox"
												id="recon-exc-canceled"
												checked={reconExcludeCanceled}
												disabled={reconRunning}
												onChange={(e) => setReconExcludeCanceled(Boolean(e.target.checked))}
											/>
											<label className="form-check-label small" htmlFor="recon-exc-canceled">Bỏ hủy</label>
										</div>

										<div className="form-check">
											<input
												className="form-check-input"
												type="checkbox"
												id="recon-exc-paid"
												checked={reconExcludePaid}
												disabled={reconRunning}
												onChange={(e) => setReconExcludePaid(Boolean(e.target.checked))}
											/>
											<label className="form-check-label small" htmlFor="recon-exc-paid">Bỏ đã nhận tiền</label>
										</div>

										<div className="d-flex align-items-center gap-2">
											<div className="form-check mb-0">
												<input
													className="form-check-input"
													type="checkbox"
													id="recon-cod-tol"
													checked={reconEnableCodTolerance}
													disabled={reconRunning}
													onChange={(e) => setReconEnableCodTolerance(Boolean(e.target.checked))}
												/>
												<label className="form-check-label small" htmlFor="recon-cod-tol">Cho lệch COD</label>
											</div>
											<input
												type="number"
												className="form-control form-control-sm"
												style={{ width: 110 }}
												value={reconCodTolerance}
												min="0"
												step="1000"
												disabled={reconRunning || !reconEnableCodTolerance}
												onChange={(e) => setReconCodTolerance(e.target.value)}
											/>
										</div>
									</div>
								</div>

								<div className="col-12 d-flex gap-2 justify-content-md-end">
									<button
										className="btn btn-outline-secondary"
										disabled={reconRunning}
										onClick={() => {
											setReconError('');
											setReconProgress('');
											setReconResult(null);
											setReconFileName('');
											setReconView('all');
											setReconPhoneFilter('');
											toast('Đã reset đối soát', 'info');
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
											<div className="fw-semibold">OK — Không thấy đơn hệ thống bị thiếu trong Excel hoặc lệch tiền.</div>
										) : (
											<div className="fw-semibold">CHƯA KHỚP — Có đơn hệ thống thiếu trong Excel hoặc lệch tiền.</div>
										)}
										<div className="small mt-1">
											Tháng đối soát: {Array.isArray(reconResult.monthKeys) ? reconResult.monthKeys.join(', ') : ''} · Excel: {reconResult.excelCount} dòng{Number(reconResult.excelGroupCount || 0) ? ` (${reconResult.excelGroupCount} cụm)` : ''} · Hệ thống: {reconResult.systemCount} đơn
										</div>
									</div>

									{!reconResult.ok && (
										<div className="row g-2">
											<div className="col-12">
												<div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-2">
													<div className="btn-group btn-group-sm" role="group" aria-label="Recon view">
														<button
															type="button"
															className={`btn ${reconView === 'all' ? 'btn-dark' : 'btn-outline-dark'}`}
															onClick={() => setReconView('all')}
														>Tất cả</button>
														<button
															type="button"
															className={`btn ${reconView === 'systemOnly' ? 'btn-warning' : 'btn-outline-warning'}`}
															onClick={() => setReconView('systemOnly')}
														>Hệ thống thiếu Excel</button>
														<button
															type="button"
																	className={`btn ${reconView === 'moneyMismatch' ? 'btn-danger' : 'btn-outline-danger'}`}
																	onClick={() => setReconView('moneyMismatch')}
														>Sai lệch tiền</button>
													</div>

													<div className="d-flex flex-wrap gap-2 align-items-center">
														<input
															type="text"
																		className="form-control form-control-sm recon-phone-input"
															placeholder="Lọc theo SĐT..."
															value={reconPhoneFilter}
															onChange={(e) => setReconPhoneFilter(e.target.value)}
														/>

														<div className="btn-group btn-group-sm" role="group" aria-label="Export CSV">
															<button
																type="button"
																className="btn btn-outline-secondary"
																onClick={() => {
																	const pf = normalizePhoneDigits(reconPhoneFilter);
																	const rows = [['type', 'order_id', 'date', 'phone', 'product', 'cod_excel', 'cod_system', 'diff', 'reason']];
																	for (const x of (Array.isArray(reconResult.moneyMismatch) ? reconResult.moneyMismatch : [])) {
																		if (pf && String(x?.group?.phoneNorm || '').indexOf(pf) < 0) continue;
																		rows.push([
																			'moneyMismatch',
																			x?.order?.id || '',
																			String(x?.group?.dateRaw || ''),
																			x?.group?.phone || '',
																			x?.group?.productDisplay || '',
																			Number(x?.group?.cod || 0),
																			Number(x?.order?.cod || 0),
																			Number(x?.diff || 0),
																			String(x?.reason || ''),
																		]);
																	}
																	for (const o of (Array.isArray(reconResult.systemOnly) ? reconResult.systemOnly : [])) {
																		if (pf && String(o?.phoneNorm || '').indexOf(pf) < 0) continue;
																		rows.push([
																			'systemOnly',
																			o?.id || '',
																			window.KTM.date.formatDateTime(o?.created_at),
																			o?.phone || '',
																			o?.productSummary || '',
																			'',
																			Number(o?.cod || 0),
																			'',
																		String(o?.excelOutsideHintText || ''),
																		]);
																	}
																	downloadCSV(`recon_${String(month || '').replace(/[^0-9\-]/g, '')}.csv`, rows);
																}}
															>Export CSV</button>
														</div>
													</div>
												</div>

																			{Array.isArray(reconResult.moneyMismatch) && reconResult.moneyMismatch.length > 0 && (
																				<div className="card border-0 shadow-sm mb-2" style={{ display: (reconView === 'all' || reconView === 'moneyMismatch') ? 'block' : 'none' }}>
																					<div className="card-body">
																						<div className="fw-semibold mb-2 text-danger">Sai lệch số tiền</div>

																						<div className="d-none d-md-block">
																							<div className="table-responsive">
																								<table className="table table-sm align-middle mb-0">
																									<thead>
																										<tr>
																											<th>Excel (dòng)</th>
																											<th>SĐT</th>
																											<th>Tên sản phẩm (Excel)</th>
																											<th className="text-end">Thu hộ (Excel)</th>
																											<th>Order ID</th>
																											<th>Tên SP (Hệ thống)</th>
																											<th className="text-end">Thu hộ (Hệ thống)</th>
																											<th className="text-end">Lệch</th>
																											<th>Lý do</th>
																										</tr>
																									</thead>
																									<tbody>
																										{reconResult.moneyMismatch
																											.filter((x) => {
																													const pf = normalizePhoneDigits(reconPhoneFilter);
																													if (!pf) return true;
																													return String(x?.group?.phoneNorm || '').includes(pf);
																											})
																											.slice(0, 30)
																											.map((x) => (
																													<tr key={`mm-${String(x?.group?.key || x?.order?.id || Math.random())}`} className="table-danger">
																														<td>
																																{x?.group?.rowIndexFirst || '—'}
																																{Number(x?.group?.rowCount || 0) > 1 ? ` (+${Number(x.group.rowCount) - 1})` : ''}
																														</td>
																														<td className="text-muted">{x?.group?.phone || '—'}</td>
																														<td style={{ minWidth: 260 }}>{x?.group?.productDisplay || '—'}</td>
																														<td className="text-end fw-semibold">{window.KTM.money.formatNumber(Number(x?.group?.cod || 0))}</td>
																														<td>
																															<button
																																type="button"
																																	className="btn btn-link btn-sm p-0 text-decoration-none"
																																	onClick={() => {
																																		setReconDrawerOrder(x?.order || null);
																																		setReconDrawerOpen(true);
																																	}}
																																>{x?.order?.id}</button>
																														</td>
																														<td style={{ minWidth: 240 }}>{x?.order?.productSummary}</td>
																														<td className="text-end fw-semibold">{window.KTM.money.formatNumber(x?.order?.cod)}</td>
																														<td className="text-end fw-semibold">{window.KTM.money.formatNumber(x?.diff)}</td>
																														<td className="text-muted" style={{ minWidth: 220 }}>{x?.reason || ''}</td>
																													</tr>
																											))}
																									</tbody>
																								</table>
																							</div>
																							{reconResult.moneyMismatch.length > 30 && (
																								<div className="text-muted small mt-2">Đang hiển thị 30/{reconResult.moneyMismatch.length} dòng.</div>
																							)}
																						</div>

																						<div className="d-md-none">
																							{reconResult.moneyMismatch
																								.filter((x) => {
																									const pf = normalizePhoneDigits(reconPhoneFilter);
																									if (!pf) return true;
																									return String(x?.group?.phoneNorm || '').includes(pf);
																								})
																								.slice(0, 30)
																								.map((x) => {
																									const rowInfo = `${x?.group?.rowIndexFirst || '—'}${Number(x?.group?.rowCount || 0) > 1 ? ` (+${Number(x.group.rowCount) - 1})` : ''}`;
																									const dateInfo = String(x?.group?.dateRaw || x?.group?.dayKey || '').trim();
																									return (
																										<div key={`mm-m-${String(x?.group?.key || x?.order?.id || Math.random())}`} className="recon-mobile-card recon-mobile-card-danger">
																											<div className="d-flex justify-content-between align-items-start gap-2">
																												<div className="fw-semibold text-truncate" style={{ maxWidth: '70%' }}>{x?.group?.phone || '—'}</div>
																												<div className="fw-semibold text-danger">{window.KTM.money.formatNumber(x?.diff)}</div>
																											</div>
																											<div className="small text-muted mt-1">Excel dòng {rowInfo}{dateInfo ? ` • ${dateInfo}` : ''}</div>

																											<div className="mt-2">
																												<div className="recon-mobile-kv">
																													<span className="text-muted">Thu hộ (Excel)</span>
																													<span className="fw-semibold">{window.KTM.money.formatNumber(Number(x?.group?.cod || 0))}</span>
																												</div>
																												<div className="recon-mobile-value mt-1">{x?.group?.productDisplay || '—'}</div>
																											</div>

																											<div className="mt-2 pt-2 border-top">
																												<div className="recon-mobile-kv">
																													<span className="text-muted">Order</span>
																													<button
																														type="button"
																															className="btn btn-link btn-sm p-0 text-decoration-none"
																															onClick={() => {
																																setReconDrawerOrder(x?.order || null);
																																setReconDrawerOpen(true);
																															}}
																														>{x?.order?.id || '—'}</button>
																												</div>
																												<div className="recon-mobile-value mt-1">{x?.order?.productSummary || '—'}</div>
																												<div className="recon-mobile-kv mt-1">
																													<span className="text-muted">Thu hộ (Hệ thống)</span>
																													<span className="fw-semibold">{window.KTM.money.formatNumber(Number(x?.order?.cod || 0))}</span>
																												</div>
																											</div>

																										{x?.reason ? <div className="small text-muted mt-2">Lý do: {x.reason}</div> : null}
																									</div>
																								);
																							})}
																						{reconResult.moneyMismatch.length > 30 && (
																								<div className="text-muted small mt-2">Đang hiển thị 30/{reconResult.moneyMismatch.length} dòng.</div>
																						)}
																					</div>
																				</div>
																			</div>
																		)}


												{Array.isArray(reconResult.systemOnly) && reconResult.systemOnly.length > 0 && (
													<div className="card border-0 shadow-sm mb-2" style={{ display: (reconView === 'all' || reconView === 'systemOnly') ? 'block' : 'none' }}>
														<div className="card-body">
															<div className="fw-semibold mb-2 text-warning">Có trong hệ thống nhưng thiếu trong Excel</div>

																			<div className="d-none d-md-block">
																				<div className="table-responsive">
																					<table className="table table-sm align-middle mb-0">
																	<thead>
																		<tr>
																			<th>Order ID</th>
																			<th>Ngày tạo</th>
																			<th>SĐT</th>
																			<th>Tên sản phẩm</th>
																			<th className="text-end">Thu hộ</th>
																			<th>Trạng thái</th>
																		</tr>
																	</thead>
																	<tbody>
																		{reconResult.systemOnly
																			.filter((o) => {
																				const pf = normalizePhoneDigits(reconPhoneFilter);
																				if (!pf) return true;
																				return String(o?.phoneNorm || '').includes(pf);
																			})
																			.slice(0, 30)
																			.map((o) => (
																			<tr key={`so-${o.id}`} className="table-warning">
																				<td>
																					<button
																						type="button"
																						className="btn btn-link btn-sm p-0 text-decoration-none"
																						onClick={() => {
																							setReconDrawerOrder(o || null);
																							setReconDrawerOpen(true);
																						}}
																					>{o.id}</button>
																				</td>
																				<td className="text-muted">{window.KTM.date.formatDateTime(o.created_at)}</td>
																				<td className="text-muted">{o.phone || '—'}</td>
																				<td style={{ minWidth: 280 }}>{o.productSummary}</td>
																				<td className="text-end fw-semibold">{window.KTM.money.formatNumber(o.cod)}</td>
																									<td className="text-muted">
																										{o.status}
																										{o?.excelOutsideHintText ? (
																											<div className="small text-muted mt-1">{o.excelOutsideHintText}</div>
																										) : null}
																									</td>
																			</tr>
																		))}
																	</tbody>
																</table>
															</div>
																				{reconResult.systemOnly.length > 30 && (
																					<div className="text-muted small mt-2">Đang hiển thị 30/{reconResult.systemOnly.length} đơn.</div>
																				)}
																			</div>

																			<div className="d-md-none">
																				{reconResult.systemOnly
																					.filter((o) => {
																						const pf = normalizePhoneDigits(reconPhoneFilter);
																						if (!pf) return true;
																						return String(o?.phoneNorm || '').includes(pf);
																					})
																					.slice(0, 30)
																					.map((o) => (
																						<div key={`so-m-${o.id}`} className="recon-mobile-card recon-mobile-card-warning">
																							<div className="d-flex justify-content-between align-items-start gap-2">
																								<button
																									type="button"
																										className="btn btn-link btn-sm p-0 text-decoration-none"
																										onClick={() => {
																											setReconDrawerOrder(o || null);
																											setReconDrawerOpen(true);
																										}}
																									>{o.id}</button>
																								<span className="badge bg-secondary">{o.status || '—'}</span>
																							</div>
																							<div className="small text-muted mt-1">{window.KTM.date.formatDateTime(o.created_at)}{o.phone ? ` • ${o.phone}` : ''}</div>
																							<div className="recon-mobile-value mt-2">{o.productSummary || '—'}</div>
																							<div className="recon-mobile-kv mt-2">
																								<span className="text-muted">Thu hộ</span>
																								<span className="fw-semibold">{window.KTM.money.formatNumber(o.cod)}</span>
																							</div>
																							{o?.excelOutsideHintText ? <div className="small text-muted mt-2">{o.excelOutsideHintText}</div> : null}
																						</div>
																					))}
																			{reconResult.systemOnly.length > 30 && (
																					<div className="text-muted small mt-2">Đang hiển thị 30/{reconResult.systemOnly.length} đơn.</div>
																			)}
																		</div>
														</div>
													</div>
												)}

											</div>
										</div>
									)}

									{Array.isArray(reconResult.matches) && reconResult.matches.length > 0 && (
										<div className="card border-0 shadow-sm mt-3">
											<div className="card-body">
												<div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
													<div className="fw-semibold">Đơn đã khớp</div>
													<div className="d-flex flex-wrap align-items-center gap-2">
														{reconPayProgress ? <span className="text-muted small">{reconPayProgress}</span> : null}
														<button
															type="button"
															className="btn btn-sm btn-primary"
															disabled={reconPayRunning || !(reconSelectedMatchIds && reconSelectedMatchIds.size)}
															onClick={markSelectedMatchesAsPaid}
														>
															Đánh dấu đã nhận tiền
														</button>
													</div>
												</div>
																		<div className="d-none d-md-block">
																			<div className="table-responsive">
																				<table className="table table-sm align-middle mb-0">
																					<thead>
																						<tr>
																							<th style={{ width: 34 }}>
																								<input
																									type="checkbox"
																									checked={(() => {
																										const pf = normalizePhoneDigits(reconPhoneFilter);
																										const visible = (reconResult.matches || []).filter((m) => {
																												const o = m?.order;
																												if (!o?.id) return false;
																												const st = String(o?.status || o?.raw?.status || '').toLowerCase();
																												if (reconExcludePaid && st === 'paid') return false;
																												if (pf && !String(o?.phoneNorm || '').includes(pf)) return false;
																												return true;
																										});
																										if (!visible.length) return false;
																										for (const m of visible) {
																												if (!reconSelectedMatchIds.has(String(m?.order?.id || ''))) return false;
																										}
																										return true;
																									})()}
																									onChange={(e) => {
																										const checked = Boolean(e.target.checked);
																										setReconSelectedMatchIds((prev) => {
																												const next = new Set(prev);
																												const pf = normalizePhoneDigits(reconPhoneFilter);
																												const visible = (reconResult.matches || []).filter((m) => {
																													const o = m?.order;
																													if (!o?.id) return false;
																													const st = String(o?.status || o?.raw?.status || '').toLowerCase();
																													if (reconExcludePaid && st === 'paid') return false;
																													if (pf && !String(o?.phoneNorm || '').includes(pf)) return false;
																													return true;
																												});
																												for (const m of visible) {
																													const id = String(m?.order?.id || '').trim();
																													if (!id) continue;
																													if (checked) next.add(id);
																													else next.delete(id);
																												}
																												return next;
																												});
																									}}
																							/>
																						</th>
																						<th>Order ID</th>
																						<th>Ngày</th>
																						<th>SĐT</th>
																						<th>Excel</th>
																						<th>Hệ thống</th>
																						<th className="text-end">Thu hộ</th>
																				<th>Trạng thái</th>
																			</tr>
																		</thead>
																		<tbody>
																			{(reconResult.matches || [])
																				.filter((m) => {
																						const o = m?.order;
																						if (!o?.id) return false;
																						const st = String(o?.status || o?.raw?.status || '').toLowerCase();
																						if (reconExcludePaid && st === 'paid') return false;
																						const pf = normalizePhoneDigits(reconPhoneFilter);
																						if (pf && !String(o?.phoneNorm || '').includes(pf)) return false;
																						return true;
																				})
																				.slice(0, 50)
																				.map((m) => {
																					const o = m.order;
																					const id = String(o.id);
																					return (
																						<tr key={`match-${id}`}>
																							<td>
																								<input
																									type="checkbox"
																										checked={reconSelectedMatchIds.has(id)}
																										onChange={(e) => {
																											const checked = Boolean(e.target.checked);
																											setReconSelectedMatchIds((prev) => {
																												const next = new Set(prev);
																												if (checked) next.add(id);
																												else next.delete(id);
																												return next;
																											});
																									}}
																								/>
																						</td>
																						<td>
																								<button
																									type="button"
																										className="btn btn-link btn-sm p-0 text-decoration-none"
																										onClick={() => {
																											setReconDrawerOrder(o || null);
																											setReconDrawerOpen(true);
																										}}
																								>
																										{id}
																									</button>
																								</td>
																						<td className="text-muted">{window.KTM.date.formatDateTime(o.created_at)}</td>
																						<td className="text-muted">{o.phone || '—'}</td>
																						<td style={{ minWidth: 240 }}>{m?.group?.productDisplay || '—'}</td>
																						<td style={{ minWidth: 240 }}>{o.productSummary || '—'}</td>
																						<td className="text-end fw-semibold">{window.KTM.money.formatNumber(o.cod)}</td>
																						<td>
																							<span className={`badge ${String(o?.status || o?.raw?.status || '').toLowerCase() === 'paid' ? 'bg-primary' : 'bg-secondary'}`}>
																									{String(o?.status || o?.raw?.status || '').toLowerCase() === 'paid' ? 'Đã nhận tiền' : (o?.status || o?.raw?.status || '—')}
																								</span>
																						</td>
																					</tr>
																					);
																				})}
																		</tbody>
																	</table>
																</div>
																<div className="text-muted small mt-2">Hiển thị tối đa 50 đơn. Dùng lọc SĐT để thu hẹp.</div>
															</div>

															<div className="d-md-none">
																	{(reconResult.matches || [])
																		.filter((m) => {
																				const o = m?.order;
																				if (!o?.id) return false;
																				const st = String(o?.status || o?.raw?.status || '').toLowerCase();
																				if (reconExcludePaid && st === 'paid') return false;
																				const pf = normalizePhoneDigits(reconPhoneFilter);
																				if (pf && !String(o?.phoneNorm || '').includes(pf)) return false;
																				return true;
																		})
																		.slice(0, 50)
																		.map((m) => {
																			const o = m?.order;
																			const id = String(o?.id || '').trim();
																			const stLower = String(o?.status || o?.raw?.status || '').toLowerCase();
																			return (
																				<div key={`match-m-${id || String(o?.created_at || '')}`} className="recon-mobile-card recon-mobile-card-success">
																					<div className="d-flex justify-content-between align-items-start gap-2">
																							<div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
																								<input
																									type="checkbox"
																										checked={Boolean(id) && reconSelectedMatchIds.has(id)}
																										onChange={(e) => {
																											const checked = Boolean(e.target.checked);
																											setReconSelectedMatchIds((prev) => {
																												const next = new Set(prev);
																												if (!id) return next;
																												if (checked) next.add(id);
																												else next.delete(id);
																												return next;
																											});
																										}}
																								/>
																								<button
																									type="button"
																										className="btn btn-link btn-sm p-0 text-decoration-none text-truncate"
																										onClick={() => {
																											setReconDrawerOrder(o || null);
																											setReconDrawerOpen(true);
																										}}
																									>{id || '—'}</button>
																								</div>
																								<span className={`badge ${stLower === 'paid' ? 'bg-primary' : 'bg-secondary'}`}>
																									{stLower === 'paid' ? 'Đã nhận tiền' : (o?.status || o?.raw?.status || '—')}
																							</span>
																						</div>
																						<div className="small text-muted mt-1">{window.KTM.date.formatDateTime(o?.created_at)}{o?.phone ? ` • ${o.phone}` : ''}</div>
																						<div className="recon-mobile-kv mt-2">
																								<span className="text-muted">Thu hộ</span>
																								<span className="fw-semibold">{window.KTM.money.formatNumber(o?.cod)}</span>
																							</div>
																						<div className="recon-mobile-value mt-2"><span className="text-muted">Excel:</span> {m?.group?.productDisplay || '—'}</div>
																						<div className="recon-mobile-value mt-1"><span className="text-muted">Hệ thống:</span> {o?.productSummary || '—'}</div>
																					</div>
																				);
																			})}
																		<div className="text-muted small mt-2">Hiển thị tối đa 50 đơn. Dùng lọc SĐT để thu hẹp.</div>
																	</div>
										</div>
									</div>
									)}
								</div>
							)}
						</div>
					</div>

					<AdminDrawer
						open={reconDrawerOpen}
						title={reconDrawerOrder ? `Order #${reconDrawerOrder.id}` : 'Order'}
						subtitle={reconDrawerOrder ? `${reconDrawerOrder.phone || ''} • ${window.KTM.money.formatNumber(Number(reconDrawerOrder.cod || 0))}` : ''}
						onClose={() => {
							setReconDrawerOpen(false);
							setReconDrawerOrder(null);
						}}
					>
						{reconDrawerOrder ? (
							<div className="small">
								<div className="mb-2">
									<div><span className="text-muted">Trạng thái:</span> {reconDrawerOrder.status || '—'}</div>
									<div><span className="text-muted">created_at:</span> {window.KTM.date.formatDateTime(reconDrawerOrder.created_at)}</div>
									<div><span className="text-muted">updated_at:</span> {reconDrawerOrder.updated_at ? window.KTM.date.formatDateTime(reconDrawerOrder.updated_at) : '—'}</div>
									<div><span className="text-muted">Sản phẩm:</span> {reconDrawerOrder.productSummary || '—'}</div>
								</div>

								<div className="fw-semibold mb-1">Line items</div>
								<div className="table-responsive">
									<table className="table table-sm align-middle mb-0">
										<thead>
											<tr>
												<th>#</th>
												<th>product_id</th>
												<th className="text-end">qty</th>
												<th className="text-end">price</th>
												<th className="text-end">total</th>
											</tr>
										</thead>
										<tbody>
											{(Array.isArray(reconDrawerOrder?.raw?.items) ? reconDrawerOrder.raw.items : []).map((it, idx) => {
												const pid = String(it?.product_id ?? it?.id ?? '').trim();
												const qty = Number(it?.qty ?? it?.quantity ?? 0) || 0;
												const price = Number(it?.price ?? it?.unit_price ?? 0) || 0;
												const total = qty * price;
												return (
													<tr key={`li-${idx}-${pid}`}>
														<td className="text-muted">{idx + 1}</td>
														<td className="text-muted">{pid || '—'}</td>
														<td className="text-end">{qty}</td>
														<td className="text-end">{window.KTM.money.formatNumber(price)}</td>
														<td className="text-end fw-semibold">{window.KTM.money.formatNumber(total)}</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						) : null}
					</AdminDrawer>
				</div>
			);
		}