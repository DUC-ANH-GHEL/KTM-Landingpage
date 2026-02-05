
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