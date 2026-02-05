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
					setReconView(systemOnly.length ? 'systemOnly' : (moneyMismatch.length ? 'moneyMismatch' : 'matches'));
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
											setReconView('matches');
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

									<div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-2">
										<div className="btn-group btn-group-sm" role="group" aria-label="Recon view">
														<button
															type="button"
															className={`btn ${reconView === 'matches' ? 'btn-success' : 'btn-outline-success'}`}
															disabled={!Array.isArray(reconResult.matches) || reconResult.matches.length === 0}
															onClick={() => setReconView('matches')}
														>Khớp ({Array.isArray(reconResult.matches) ? reconResult.matches.length : 0})</button>
														<button
															type="button"
															className={`btn ${reconView === 'systemOnly' ? 'btn-warning' : 'btn-outline-warning'}`}
															disabled={!Array.isArray(reconResult.systemOnly) || reconResult.systemOnly.length === 0}
															onClick={() => setReconView('systemOnly')}
														>Thiếu Excel ({Array.isArray(reconResult.systemOnly) ? reconResult.systemOnly.length : 0})</button>
														<button
															type="button"
															className={`btn ${reconView === 'moneyMismatch' ? 'btn-danger' : 'btn-outline-danger'}`}
															disabled={!Array.isArray(reconResult.moneyMismatch) || reconResult.moneyMismatch.length === 0}
															onClick={() => setReconView('moneyMismatch')}
														>Sai tiền ({Array.isArray(reconResult.moneyMismatch) ? reconResult.moneyMismatch.length : 0})</button>
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

												{Array.isArray(reconResult.moneyMismatch) && reconResult.moneyMismatch.length > 0 && reconView === 'moneyMismatch' && (
													<div className="card border-0 shadow-sm mb-2">
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