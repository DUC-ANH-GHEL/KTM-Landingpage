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


															{Array.isArray(reconResult.systemOnly) && reconResult.systemOnly.length > 0 && reconView === 'systemOnly' && (
																<div className="card border-0 shadow-sm mb-2">
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

											{reconView === 'matches' && Array.isArray(reconResult.matches) && reconResult.matches.length > 0 && (
										<div className="card border-0 shadow-sm mb-2">
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
																				{(() => {
																					const visibleMatches = (reconResult.matches || [])
																						.filter((m) => {
																							const o = m?.order;
																							if (!o?.id) return false;
																							const st = String(o?.status || o?.raw?.status || '').toLowerCase();
																							if (reconExcludePaid && st === 'paid') return false;
																							const pf = normalizePhoneDigits(reconPhoneFilter);
																							if (pf && !String(o?.phoneNorm || '').includes(pf)) return false;
																							return true;
																						})
																						.slice(0, 50);

																					const visibleIds = visibleMatches
																						.map((m) => String(m?.order?.id || '').trim())
																						.filter(Boolean);

																					const allChecked = (() => {
																						if (!visibleIds.length) return false;
																						for (const id of visibleIds) {
																							if (!reconSelectedMatchIds.has(id)) return false;
																						}
																						return true;
																					})();

																					return (
																						<>
																							<div className="d-flex align-items-center justify-content-between mb-2">
																								<label className="d-flex align-items-center gap-2 small mb-0">
																									<input
																										type="checkbox"
																										checked={allChecked}
																										disabled={!visibleIds.length}
																										onChange={(e) => {
																											const checked = Boolean(e.target.checked);
																											setReconSelectedMatchIds((prev) => {
																												const next = new Set(prev);
																												for (const id of visibleIds) {
																														if (checked) next.add(id);
																														else next.delete(id);
																													}
																												return next;
																												});
																										}}
																								/>
																								<span>Chọn tất cả (đang hiển thị)</span>
																							</label>

																								<button
																									type="button"
																										className="btn btn-link btn-sm p-0 text-decoration-none"
																										disabled={!visibleIds.length}
																										onClick={() => {
																											setReconSelectedMatchIds((prev) => {
																												const next = new Set(prev);
																												for (const id of visibleIds) next.delete(id);
																												return next;
																											});
																										}}
																								>
																										Bỏ chọn
																								</button>
																							</div>

																							{visibleMatches.map((m) => {
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
																						</>
																					);
																				})()}
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