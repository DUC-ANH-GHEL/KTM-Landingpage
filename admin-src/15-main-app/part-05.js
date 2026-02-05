                    <span className="badge rounded-pill bg-secondary bg-opacity-10 text-dark">
                      <i className="fas fa-truck me-1"></i>Ship ước tính: {shipPercent}%
                    </span>
                    <span className="badge rounded-pill bg-dark bg-opacity-10 text-dark">
                      <i className="fas fa-receipt me-1"></i>{formatNumber(stats.activeOrders)} đơn
                    </span>
                    <span className="badge rounded-pill bg-info bg-opacity-10 text-dark">
                      <i className="fas fa-user me-1"></i>{formatNumber(stats.uniqueCustomers)} khách
                    </span>
                    <span className="badge rounded-pill bg-warning bg-opacity-10 text-dark">
                      <i className="fas fa-boxes-stacked me-1"></i>{formatNumber(stats.totalQty)} SL
                    </span>
                    <span className="badge rounded-pill bg-primary bg-opacity-10 text-dark">
                      <i className="fas fa-hand-holding-dollar me-1"></i>
                      Đã nhận tiền: {formatNumber(stats.statusCounts.paid)}/{formatNumber(stats.statusCounts.done)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reconciliation moved to separate menu: activeMenu === 'recon' */}
            {/*
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <div className="fw-semibold">
                    <i className="fas fa-file-excel me-2 text-success"></i>
                    Đối soát công nợ (Excel)
                  </div>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <span className="text-muted small">Check: <span className="fw-semibold">Tên sản phẩm</span> + <span className="fw-semibold">Tổng tiền thu hộ</span></span>
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
                      {reconFileName ? `File: ${reconFileName}` : 'Header cần có: "Tên sản phẩm" và "Tổng Tiền Thu Hộ". Có cột "Ngày" thì sẽ tự tải đúng tháng trong file.'}
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
                        showToast('Đã reset đối soát', 'info');
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
                        <div className="fw-semibold">OK — File Excel đã khớp đầy đủ với hệ thống.</div>
                      ) : (
                        <div className="fw-semibold">CHƯA KHỚP — Có thiếu/sai lệch so với hệ thống.</div>
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
                                className={`btn ${reconView === 'excelOnly' ? 'btn-warning' : 'btn-outline-warning'}`}
                                onClick={() => setReconView('excelOnly')}
                              >Excel thiếu hệ thống</button>
                              <button
                                type="button"
                                className={`btn ${reconView === 'amountMismatch' ? 'btn-danger' : 'btn-outline-danger'}`}
                                onClick={() => setReconView('amountMismatch')}
                              >Sai lệch tiền</button>
                            </div>

                            <div className="d-flex flex-wrap gap-2 align-items-center">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                style={{ width: 220 }}
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
                                    for (const x of (Array.isArray(reconResult.amountMismatch) ? reconResult.amountMismatch : [])) {
                                      if (pf && String(x?.group?.phoneNorm || '').indexOf(pf) < 0) continue;
                                      rows.push([
                                        'amountMismatch',
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
                                        '',
                                      ]);
                                    }
                                    for (const item of (Array.isArray(reconResult.excelOnly) ? reconResult.excelOnly : [])) {
                                      const g = item?.group;
                                      if (pf && String(g?.phoneNorm || '').indexOf(pf) < 0) continue;
                                      rows.push([
                                        'excelOnly',
                                        '',
                                        String(g?.dateRaw || ''),
                                        g?.phone || '',
                                        g?.productDisplay || '',
                                        Number(g?.cod || 0),
                                        '',
                                        '',
                                        (Array.isArray(item?.suggestions) && item.suggestions.length)
                                          ? item.suggestions.map((s) => `#${s.id}(${window.KTM.money.formatNumber(s.cod)}|${Math.round((s.score || 0) * 100)}%)`).join(' | ')
                                          : '',
                                      ]);
                                    }
                                    downloadCSV(`recon_${String(month || '').replace(/[^0-9\-]/g, '')}.csv`, rows);
                                  }}
                                >Export CSV</button>
                              </div>
                            </div>
                          </div>

                          {Array.isArray(reconResult.amountMismatch) && reconResult.amountMismatch.length > 0 && (
                            <div className="card border-0 shadow-sm mb-2" style={{ display: (reconView === 'all' || reconView === 'amountMismatch') ? 'block' : 'none' }}>
                              <div className="card-body">
                                <div className="fw-semibold mb-2 text-danger">Sai lệch số tiền (tìm theo tên sản phẩm)</div>
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
                                      {reconResult.amountMismatch
                                        .filter((x) => {
                                          const pf = normalizePhoneDigits(reconPhoneFilter);
                                          if (!pf) return true;
                                          return String(x?.group?.phoneNorm || '').includes(pf);
                                        })
                                        .slice(0, 30)
                                        .map((x) => (
                                        <tr key={`mm-${String(x?.group?.key || x?.order?.id || Math.random())}`}
                                          className="table-danger">
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
                                          <td style={{ minWidth: 240 }}>{x.order.productSummary}</td>
                                          <td className="text-end fw-semibold">{window.KTM.money.formatNumber(x.order.cod)}</td>
                                          <td className="text-end fw-semibold">{window.KTM.money.formatNumber(x.diff)}</td>
                                          <td className="text-muted" style={{ minWidth: 220 }}>{x?.reason || ''}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                {reconResult.amountMismatch.length > 30 && (
                                  <div className="text-muted small mt-2">Đang hiển thị 30/{reconResult.amountMismatch.length} dòng.</div>
                                )}
                              </div>
                            </div>
                          )}

                          {Array.isArray(reconResult.systemOnly) && reconResult.systemOnly.length > 0 && (
                            <div className="card border-0 shadow-sm mb-2" style={{ display: (reconView === 'all' || reconView === 'systemOnly') ? 'block' : 'none' }}>
                              <div className="card-body">
                                <div className="fw-semibold mb-2 text-warning">Có trong hệ thống nhưng thiếu trong Excel</div>
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
                                          <td className="text-muted">{o.status}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                {reconResult.systemOnly.length > 30 && (
                                  <div className="text-muted small mt-2">Đang hiển thị 30/{reconResult.systemOnly.length} đơn.</div>
                                )}
                              </div>
                            </div>
                          )}

                          {Array.isArray(reconResult.excelOnly) && reconResult.excelOnly.length > 0 && (
                            <div className="card border-0 shadow-sm" style={{ display: (reconView === 'all' || reconView === 'excelOnly') ? 'block' : 'none' }}>
                              <div className="card-body">
                                <div className="fw-semibold mb-2 text-warning">Có trong Excel nhưng không thấy đơn khớp trong hệ thống</div>
                                <div className="table-responsive">
                                  <table className="table table-sm align-middle mb-0">
                                    <thead>
                                      <tr>
                                        <th>Excel (dòng)</th>
                                        <th>Ngày</th>
                                        <th>SĐT</th>
                                        <th>Tên sản phẩm</th>
                                        <th className="text-end">Thu hộ</th>
                                        <th>Gợi ý (top 3)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {reconResult.excelOnly
                                        .filter((item) => {
                                          const pf = normalizePhoneDigits(reconPhoneFilter);
                                          if (!pf) return true;
                                          return String(item?.group?.phoneNorm || '').includes(pf);
                                        })
                                        .slice(0, 30)
                                        .map((item) => {
                                          const g = item?.group;
                                          const sugg = Array.isArray(item?.suggestions) ? item.suggestions : [];
                                          return (
                                        <tr key={`eo-${String(g?.key || g?.rowIndexFirst || Math.random())}`} className="table-warning">
                                          <td>
                                            {g?.rowIndexFirst || '—'}
                                            {Number(g?.rowCount || 0) > 1 ? ` (+${Number(g.rowCount) - 1})` : ''}
                                          </td>
                                          <td className="text-muted">{String(g?.dateRaw || '')}</td>
                                          <td className="text-muted">{g?.phone || '—'}</td>
                                          <td style={{ minWidth: 280 }}>{g?.productDisplay || '—'}</td>
                                          <td className="text-end fw-semibold">{window.KTM.money.formatNumber(Number(g?.cod || 0))}</td>
                                          <td className="text-muted" style={{ minWidth: 280 }}>
                                            {sugg.length ? (
                                              <div className="small">
                                                {sugg.map((s) => (
                                                  <div key={`s-${s.id}`}>#{s.id} · {window.KTM.money.formatNumber(s.cod)} · {Math.round((s.score || 0) * 100)}%<br />
                                                    <span className="text-muted">{Array.isArray(s.reasons) ? s.reasons.join(' · ') : ''}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : '—'}
                                          </td>
                                        </tr>
                                          );
                                        })}
                                    </tbody>
                                  </table>
                                </div>
                                {reconResult.excelOnly.length > 30 && (
                                  <div className="text-muted small mt-2">Đang hiển thị 30/{reconResult.excelOnly.length} dòng.</div>
                                )}
                              </div>
                            </div>
                          )}
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
                        </tr>