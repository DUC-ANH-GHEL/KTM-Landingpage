                            const selected = String(selections?.[groupName] || '').trim();
                            return (
                              <div key={groupName}>
                                <label className="form-label small text-muted mb-1">{groupName}</label>
                                <select
                                  className="form-select"
                                  value={selected}
                                  onChange={(e) => {
                                    const nextLabel = String(e.target.value || '').trim();
                                    setForm((prev) => {
                                      const items = Array.isArray(prev.items) ? [...prev.items] : [];
                                      const cur = { ...(items[idx] || {}) };
                                      const p = getProductById(cur.product_id);
                                      const groups = normalizeVariantGroups(p?.variants);
                                      const nextSelections = (cur?.variant_json && typeof cur.variant_json === 'object') ? { ...cur.variant_json } : {};
                                      if (nextLabel) nextSelections[groupName] = nextLabel;
                                      else delete nextSelections[groupName];
                                      const variantText = buildVariantTextFromSelections(nextSelections);
                                      const unitPrice = computeUnitPriceForProductAndSelections(p, nextSelections);
                                      items[idx] = {
                                        ...cur,
                                        variant_json: Object.keys(nextSelections).length ? nextSelections : null,
                                        variant: variantText,
                                        unit_price: unitPrice,
                                      };
                                      return { ...prev, items };
                                    });
                                  }}
                                  style={{ borderRadius: 10, padding: 12 }}
                                >
                                  <option value="">-- chọn {groupName} --</option>
                                  {(Array.isArray(g?.options) ? g.options : []).map((opt) => (
                                    <option key={opt.label} value={opt.label}>
                                      {opt.label}{Number.isFinite(Number(opt?.price)) ? ` (${formatVND(Number(opt.price))})` : (Number(opt?.price_delta) ? ` (${opt.price_delta > 0 ? '+' : ''}${opt.price_delta})` : '')}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {editingId && (
                      <div className="form-check mt-1">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`order-split-deliver-${idx}`}
                          checked={!!splitDeliverNow[idx]}
                          onChange={(e) => {
                            const checked = !!e.target.checked;
                            setSplitDeliverNow((prev) => {
                              const arr = Array.isArray(prev) ? [...prev] : [];
                              const targetLen = Array.isArray(form.items) ? form.items.length : 0;
                              while (arr.length < targetLen) arr.push(true);
                              arr[idx] = checked;
                              return arr;
                            });
                          }}
                          disabled={saving || splitting}
                        />
                        <label className="form-check-label small text-muted" htmlFor={`order-split-deliver-${idx}`}>
                          Giao đợt 1
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="col-8 col-md-3">
                    <input
                      type="number"
                      className="form-control"
                      value={it.quantity}
                      onChange={(e) => {
                        const nextQty = e.target.value;
                        setForm((prev) => {
                          const items = Array.isArray(prev.items) ? [...prev.items] : [];
                          items[idx] = { ...(items[idx] || { product_id: "" }), quantity: nextQty };
                          return { ...prev, items };
                        });
                      }}
                      min="1"
                      style={{ borderRadius: 10, padding: 12 }}
                    />
                    {(() => {
                      const issue = orderFieldIssues.items?.[idx];
                      if (!issue) return null;
                      return !!issue.qtyError ? (
                        <div className="form-text text-danger">{issue.qtyError}</div>
                      ) : null;
                    })()}
                  </div>
                  <div className="col-4 col-md-1 d-flex justify-content-end">
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => {
                        setForm((prev) => {
                          const items = Array.isArray(prev.items) ? [...prev.items] : [];
                          items.splice(idx, 1);
                          return { ...prev, items: items.length ? items : [{ product_id: "", quantity: 1, unit_price: null, variant: '', variant_json: null }] };
                        });
                        setItemSearches((prev) => {
                          const arr = Array.isArray(prev) ? [...prev] : [];
                          arr.splice(idx, 1);
                          return arr.length ? arr : [''];
                        });
                        setSplitDeliverNow((prev) => {
                          const arr = Array.isArray(prev) ? [...prev] : [];
                          arr.splice(idx, 1);
                          return arr;
                        });
                        setOpenProductDropdownIdx((prev) => {
                          if (prev == null) return prev;
                          if (prev === idx) return null;
                          if (prev > idx) return prev - 1;
                          return prev;
                        });
                      }}
                      disabled={saving || splitting || (Array.isArray(form.items) ? form.items.length : 1) <= 1}
                      title="Xóa sản phẩm"
                      style={{ borderRadius: 10, padding: 10 }}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(() => {
            const items = Array.isArray(form.items) ? form.items : [];
            const normalizedItems = items.filter(it => it?.product_id);
            const subtotal = getItemsSubtotal(normalizedItems);
            const shipInfo = getOrderShipInfo(normalizedItems);
            const adjDerived = getAdjustmentDerivedFromForm(form);
            const adj = adjDerived.amount;
            const total = subtotal + (shipInfo.found ? shipInfo.fee : 0) + adj;

            return (
              <div className="col-12">
                <div className="d-flex flex-column gap-1 small bg-light rounded-3 p-3">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Tạm tính</span>
                    <span className="fw-semibold">{formatVND(subtotal)}</span>
                  </div>
                  {shipInfo.found && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Ship</span>
                      <span className="fw-semibold">{formatVND(shipInfo.fee)}</span>
                    </div>
                  )}
                  {!!orderFieldIssues.shipAbnormalWarn && (
                    <div className="text-warning">{orderFieldIssues.shipAbnormalWarn}</div>
                  )}
                  {adj !== 0 && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Điều chỉnh</span>
                      <span className="fw-semibold">{formatVND(adj)}</span>
                    </div>
                  )}
                  {(form.note || '').trim() && (
                    <div className="text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      Ghi chú đơn: {(form.note || '').trim()}
                    </div>
                  )}
                  {!!adjDerived.summaryText && (
                    <div className="text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      Ghi chú điều chỉnh: {adjDerived.summaryText}
                    </div>
                  )}
                  <div className="d-flex justify-content-between pt-1 border-top">
                    <span className="text-muted">Tổng</span>
                    <span className="fw-bold">{formatVND(total)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      );

      return (
        <div className="product-manager">
          <Loading show={saving || !!deletingId || !!updatingId} />

          <div className="orders-ops-toolbar card p-3">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center gap-2">
                  <h5 className="mb-0">Đơn hàng</h5>
                  <span className="badge rounded-pill bg-dark bg-opacity-10 text-dark">
                    {statusCounts.all} đơn
                  </span>
                  {isSearchActive && (
                    <span className="badge rounded-pill bg-warning bg-opacity-25 text-dark">
                      Search mode
                    </span>
                  )}
                </div>
                <div className="text-muted small mt-1">
                  Hotkeys: <span className="fw-semibold">/</span> search • <span className="fw-semibold">N</span> tạo đơn • <span className="fw-semibold">Esc</span> đóng drawer
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => (isSearchActive ? runOrderSearch(orderSearchQuery) : loadOrders())}
                  disabled={orderSearchLoading}
                  title="Làm mới"
                >
                  <i className="fas fa-rotate"></i>
                </button>
                <button className="btn btn-dark btn-sm" onClick={() => openCreateModal()} disabled={saving || !!deletingId}>
                  <i className="fas fa-plus me-2"></i>Tạo đơn
                </button>
              </div>
            </div>

            <div className="orders-chip-row mt-3">
              <button
                type="button"
                className={`orders-chip d-md-none ${pinnedOnly && !overdueOnly && !isSearchActive ? 'active' : ''}`}
                onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setTodayOnly(false); setPinnedOnly((v) => !v); }}
                title="Đơn ưu tiên (đã ghim)"
              >
                <i className="fas fa-star me-1"></i>Ưu tiên{' '}
                <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{pinnedCount}</span>
              </button>
              <button
                type="button"
                className={`orders-chip d-md-none ${todayOnly && !overdueOnly && !isSearchActive ? 'active' : ''}`}
                onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setPinnedOnly(false); setTodayOnly((v) => !v); }}
                title="Đơn cần xử lý hôm nay"
              >
                <i className="fas fa-calendar me-1"></i>Hôm nay{' '}
                <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{todayCount}</span>
              </button>

              <button
                type="button"
                className={`orders-chip ${!filterStatus && !overdueOnly && !isSearchActive ? 'active' : ''}`}
                onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus(''); }}
              >
                Tất cả <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.all}</span>
              </button>
              <button type="button" className={`orders-chip ${filterStatus === 'draft' && !overdueOnly && !isSearchActive ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus('draft'); setFilterMonth(''); }}>
                Nháp <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.draft}</span>
              </button>
              <button type="button" className={`orders-chip ${filterStatus === 'pending' && !overdueOnly && !isSearchActive ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus('pending'); }}>
                Chờ xử lý <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.pending}</span>
              </button>
              <button type="button" className={`orders-chip ${filterStatus === 'processing' && !overdueOnly && !isSearchActive ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus('processing'); }}>
                Vận chuyển <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.processing}</span>
              </button>
              <button type="button" className={`orders-chip ${filterStatus === 'done' && !overdueOnly && !isSearchActive ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus('done'); }}>
                Hoàn thành <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.done}</span>
              </button>
              <button type="button" className={`orders-chip ${filterStatus === 'paid' && !overdueOnly && !isSearchActive ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus('paid'); }}>
                Đã nhận tiền <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.paid}</span>
              </button>
              <button type="button" className={`orders-chip ${filterStatus === 'canceled' && !overdueOnly && !isSearchActive ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus('canceled'); }}>
                Hủy <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.canceled}</span>
              </button>
            </div>

            <div className="orders-presets mt-2 d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => applyOrdersPreset('thisMonth')} disabled={isSearchActive}>
                <i className="fas fa-calendar me-2"></i>Tháng này
              </button>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => applyOrdersPreset('overduePending')} disabled={isSearchActive}>
                <i className="fas fa-triangle-exclamation me-2"></i>Chậm &gt; {OVERDUE_PENDING_DAYS} ngày
              </button>
              <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => applyOrdersPreset('draftExpiring')} disabled={isSearchActive}>
                <i className="fas fa-clock me-2"></i>Nháp sắp hủy
              </button>
              {(filterStatus || overdueOnly || (!filterMonth && !isSearchActive)) && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => applyOrdersPreset('all')}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="orders-filterbar mt-3 d-flex flex-wrap gap-2 align-items-center">
              <div className="input-group input-group-sm orders-search">
                <span className="input-group-text" aria-hidden="true"><i className="fas fa-search"></i></span>
                <input
                  ref={orderSearchInputRef}
                  type="text"
                  className="form-control"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Search tên / SĐT… (nhấn /)"
                  aria-label="Search đơn hàng theo tên hoặc SĐT"
                />
                {String(orderSearchQuery || '').trim() && (
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setOrderSearchQuery('')} disabled={orderSearchLoading}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
                {orderSearchLoading && (
                  <span className="input-group-text" title="Đang search..." aria-label="Đang search">
                    <span className="spinner-border spinner-border-sm text-warning" role="status" aria-hidden="true"></span>
                  </span>
                )}
              </div>

              <div className="input-group input-group-sm orders-month">
                <span className="input-group-text" aria-hidden="true"><i className="fas fa-calendar-alt"></i></span>
                <input
                  type="month"
                  className="form-control"
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  aria-label="Chọn tháng"
                  disabled={overdueOnly || isSearchActive}
                />
              </div>

              <div className="text-muted small ms-auto">
                {isSearchActive ? 'Search bỏ qua filter' : (overdueOnly ? 'Đang xem đơn chậm' : (filterStatus ? `Lọc: ${getStatusLabel(filterStatus)}` : ''))}
              </div>
            </div>
          </div>

          {/* Mobile sticky context header */}
          <div className={`orders-context-header d-md-none ${mobileContextHeaderVisible ? 'visible' : ''}`}>
            <div className="orders-context-text">
              {(() => {
                if (isSearchActive) {
                  const q = String(orderSearchQuery || '').trim();
                  return `Search: ${q ? `"${q}"` : ''} • ${ordersToRender.length} kết quả`;
                }
                if (overdueOnly) return `Đơn chậm • ${ordersToRender.length} đơn`;
                if (pinnedOnly) return `Ưu tiên • ${ordersToRender.length} đơn`;
                if (todayOnly) return `Hôm nay • ${ordersToRender.length} đơn`;
                if (filterStatus) return `Lọc: ${getStatusLabel(filterStatus)} • ${ordersToRender.length} đơn`;
                return `Tất cả • ${ordersToRender.length} đơn`;
              })()}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setOrderSearchQuery('');
                setPinnedOnly(false);
                setTodayOnly(false);
                applyOrdersPreset('all');
              }}
              aria-label="Clear"
            >
              Clear
            </button>
          </div>

          <div className="card p-3">
            <div className="d-flex align-items-center justify-content-between">
              <h6 className="mb-0">Danh sách đơn hàng</h6>
              <span className="text-muted small">
                {isSearchActive
                  ? `${ordersToRender.length} kết quả`
                  : (filterStatus ? `${filteredOrders.length}/${orders.length} đơn` : `${orders.length}${ordersHasMore ? '+' : ''} đơn`)
                }
              </span>
            </div>

            {isSearchActive && orderSearchError && (
              <div className="alert alert-danger mt-3 mb-0" role="alert">
                {orderSearchError}
              </div>
            )}

            {overduePendingOrdersAll.length > 0 && (
              <div className="alert alert-warning d-flex align-items-center justify-content-between gap-2 mt-3 mb-0" role="alert">
                <div style={{ minWidth: 0 }}>
                  <i className="fas fa-triangle-exclamation me-2"></i>
                  Có <strong>{overduePendingOrdersAll.length}</strong> đơn <strong>Chờ xử lý</strong> quá {OVERDUE_PENDING_DAYS} ngày.
                  {loadingAllOrders && <span className="ms-2 text-muted small">(đang cập nhật...)</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => {
                    setOverdueOnly(true);
                    setFilterStatus('pending');
                  }}
                >
                  Xem ngay
                </button>
              </div>
            )}

            {draftExpiringOrdersAll.length > 0 && (
              <div className="alert alert-warning d-flex align-items-center justify-content-between gap-2 mt-3 mb-0" role="alert">
                <div style={{ minWidth: 0 }}>
                  <i className="fas fa-clock me-2"></i>
                  Có <strong>{draftExpiringOrdersAll.length}</strong> đơn <strong>Nháp</strong> sắp tự hủy (còn ≤ {DRAFT_WARN_REMAINING_DAYS} ngày).
                  {loadingDraftExpiringOrders && <span className="ms-2 text-muted small">(đang cập nhật...)</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => {
                    setOverdueOnly(false);
                    setFilterStatus('draft');
                    setFilterMonth('');
                    loadOrders();
                  }}
                >
                  Xem ngay
                </button>
              </div>
            )}

            {(isSearchActive ? orderSearchLoading : loading) ? (
              <div className="orders-skeleton-wrap mt-3">
                <div className="d-md-none">
                  {new Array(6).fill(0).map((_, idx) => (
                    <div key={idx} className="card mb-2">
                      <div className="card-body p-3">
                        <div className="admin-skeleton-line w-50 mb-2"></div>
                        <div className="admin-skeleton-line w-75 mb-2"></div>
                        <div className="admin-skeleton-line w-35"></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="d-none d-md-block">
                  <div className="table-responsive orders-table-wrap mt-3">
                    <table className="table orders-table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Khách hàng</th>
                          <th>SĐT</th>
                          <th>Sản phẩm</th>
                          <th>SL</th>
                          <th>Tổng tiền</th>
                          <th>Trạng thái</th>
                          <th>Thời gian</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {new Array(10).fill(0).map((_, idx) => (
                          <tr key={idx}>
                            <td><div className="admin-skeleton-line w-60"></div></td>
                            <td><div className="admin-skeleton-line w-70"></div></td>
                            <td><div className="admin-skeleton-line w-85"></div></td>
                            <td><div className="admin-skeleton-line w-30"></div></td>
                            <td><div className="admin-skeleton-line w-50"></div></td>
                            <td><div className="admin-skeleton-line w-40"></div></td>
                            <td><div className="admin-skeleton-line w-55"></div></td>
                            <td><div className="admin-skeleton-line w-40"></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (isSearchActive ? ordersToRender.length === 0 : orders.length === 0) ? (
              <div className="text-center py-4 text-muted">{isSearchActive ? 'Không có kết quả' : 'Chưa có đơn hàng'}</div>
            ) : (!isSearchActive && filteredOrders.length === 0) ? (
              <div className="text-center py-4 text-muted">Không có đơn phù hợp</div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="d-md-none mt-3">
                  {mobileOrdersToRender.map(order => (
                    <div
                      key={order.id}
                      className={`orders-mobile-swipe-shell mb-2 ${swipePreview?.id === String(order.id) ? `swipe-preview swipe-${swipePreview?.dir || ''}` : ''}`}
                      role="button"
                      tabIndex={0}