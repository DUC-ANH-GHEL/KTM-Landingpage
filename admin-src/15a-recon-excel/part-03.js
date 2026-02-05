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