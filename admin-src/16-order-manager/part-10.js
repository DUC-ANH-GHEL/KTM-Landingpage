                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="orders-status-popover-footer">
                        <button type="button" className="btn btn-sm btn-dark" onClick={() => { openMobileSheet(statusPopoverOrder); closeStatusPopover(); }}>
                          <i className="fas fa-bolt me-2"></i>Thao tác
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile quick action sheet */}
                {mobileSheetOpen && mobileSheetOrder && (
                  <div className="admin-sheet-root" role="dialog" aria-modal="true" onClick={() => closeMobileSheet()}>
                    <div className="admin-sheet" onClick={(e) => e.stopPropagation()}>
                      <div className="admin-sheet-handle" />
                      <div className="admin-sheet-header">
                        <div style={{ minWidth: 0 }}>
                          <div className="fw-semibold admin-sheet-title">{mobileSheetOrder.customer_name || 'Đơn hàng'}</div>
                          <div className="text-muted small d-flex align-items-center gap-2" style={{ flexWrap: 'wrap' }}>
                            <span className="font-monospace">{mobileSheetOrder.phone || ''}</span>
                            <span className={`badge ${getStatusBadgeClass(mobileSheetOrder.status)}`}>{getStatusLabel(mobileSheetOrder.status)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => closeMobileSheet()}
                          aria-label="Đóng"
                        >
                          <i className="fas fa-xmark"></i>
                        </button>
                      </div>

                      <div className="admin-sheet-actions">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => { handleCopyOrder(mobileSheetOrder); closeMobileSheet(); }}
                          disabled={saving || !!deletingId || updatingId === mobileSheetOrder.id}
                        >
                          <i className="fas fa-copy me-2"></i>Copy
                        </button>
                        {!!String(mobileSheetOrder.phone || '').trim() && (
                          <a
                            className="btn btn-outline-secondary"
                            href={`tel:${String(mobileSheetOrder.phone || '').trim()}`}
                            onClick={() => closeMobileSheet()}
                          >
                            <i className="fas fa-phone me-2"></i>Gọi
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn btn-dark"
                          onClick={() => { openOrderInspector(mobileSheetOrder); closeMobileSheet(); }}
                        >
                          <i className="fas fa-eye me-2"></i>Mở chi tiết
                        </button>

                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => deleteOrder(mobileSheetOrder.id)}
                          disabled={saving || !!deletingId || updatingId === mobileSheetOrder.id}
                        >
                          <i className="fas fa-trash me-2"></i>Xóa
                        </button>
                      </div>

                      <div className="admin-sheet-section-title">Đổi trạng thái</div>
                      <div className="orders-status-grid">
                        {ORDER_STATUS_OPTIONS.map((opt) => {
                          const active = normalizeOrderStatus(mobileSheetOrder.status) === normalizeOrderStatus(opt.value);
                          const busy = saving || !!deletingId || updatingId === mobileSheetOrder.id;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              className={`orders-status-chip ${active ? 'active' : ''}`}
                              onClick={() => {
                                if (active) return;
                                updateOrderStatus(mobileSheetOrder, opt.value);
                                closeMobileSheet();
                              }}
                              disabled={busy}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile filter sheet */}
                {mobileFilterSheetOpen && (
                  <div className="admin-sheet-root" role="dialog" aria-modal="true" onClick={() => closeMobileFilterSheet()}>
                    <div className="admin-sheet" onClick={(e) => e.stopPropagation()}>
                      <div className="admin-sheet-handle" />
                      <div className="admin-sheet-header">
                        <div style={{ minWidth: 0 }}>
                          <div className="fw-semibold admin-sheet-title">Lọc đơn hàng</div>
                          <div className="text-muted small">Tối ưu cho thao tác một tay</div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => closeMobileFilterSheet()}
                          aria-label="Đóng"
                        >
                          <i className="fas fa-xmark"></i>
                        </button>
                      </div>

                      <div className="p-3">
                        <div className="d-flex flex-wrap gap-2">
                          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => applyOrdersPreset('thisMonth')} disabled={isSearchActive}>
                            <i className="fas fa-calendar me-2"></i>Tháng này
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => applyOrdersPreset('overduePending')} disabled={isSearchActive}>
                            <i className="fas fa-triangle-exclamation me-2"></i>Chậm
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => applyOrdersPreset('draftExpiring')} disabled={isSearchActive}>
                            <i className="fas fa-clock me-2"></i>Nháp sắp hủy
                          </button>
                        </div>

                        <div className="mt-3">
                          <div className="fw-semibold mb-2">Trạng thái</div>
                          <div className="orders-filter-chip-grid">
                            <button type="button" className={`orders-filter-chip ${!filterStatus && !overdueOnly ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus(''); }}>
                              Tất cả
                            </button>
                            {ORDER_STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`orders-filter-chip ${filterStatus === opt.value && !overdueOnly ? 'active' : ''}`}
                                onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus(opt.value); if (opt.value === 'draft') setFilterMonth(''); }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="form-label small text-muted mb-1">Tháng</label>
                          <input
                            type="month"
                            className="form-control"
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            disabled={overdueOnly || isSearchActive}
                          />
                          <div className="form-text">Bật “Chậm” sẽ bỏ qua tháng.</div>
                        </div>

                        <div className="form-check mt-3">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="ordersOverdueOnly"
                            checked={overdueOnly}
                            onChange={(e) => {
                              if (isSearchActive) setOrderSearchQuery('');
                              const v = !!e.target.checked;
                              setOverdueOnly(v);
                              if (v) {
                                setFilterMonth('');
                                setFilterStatus('pending');
                              }
                            }}
                            disabled={isSearchActive}
                          />
                          <label className="form-check-label" htmlFor="ordersOverdueOnly">
                            Chỉ xem đơn chậm &gt; {OVERDUE_PENDING_DAYS} ngày
                          </label>
                        </div>

                        <div className="d-flex gap-2 mt-4">
                          <button type="button" className="btn btn-outline-secondary" onClick={() => applyOrdersPreset('all')} disabled={isSearchActive}>
                            Reset
                          </button>
                          <button type="button" className="btn btn-dark flex-grow-1" onClick={() => closeMobileFilterSheet()}>
                            Xong
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile sticky mini-toolbar (one-hand reach) */}
                <div className={`orders-mobile-toolbar d-md-none ${mobileMiniToolbarVisible ? 'visible' : ''}`}>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onPointerDown={(e) => {
                      if (e.button != null && e.button !== 0) return;
                      searchBtnLongPressFiredRef.current = false;
                      try {
                        if (searchBtnLongPressTimerRef.current) clearTimeout(searchBtnLongPressTimerRef.current);
                      } catch {}
                      searchBtnLongPressTimerRef.current = setTimeout(() => {
                        searchBtnLongPressFiredRef.current = true;
                        openSearchPalette(orderSearchQuery);
                      }, 460);
                    }}
                    onPointerUp={() => {
                      try {
                        if (searchBtnLongPressTimerRef.current) clearTimeout(searchBtnLongPressTimerRef.current);
                      } catch {}
                      searchBtnLongPressTimerRef.current = null;
                    }}
                    onPointerCancel={() => {
                      try {
                        if (searchBtnLongPressTimerRef.current) clearTimeout(searchBtnLongPressTimerRef.current);
                      } catch {}
                      searchBtnLongPressTimerRef.current = null;
                    }}
                    onClick={() => {
                      if (searchBtnLongPressFiredRef.current) {
                        searchBtnLongPressFiredRef.current = false;
                        return;
                      }
                      try {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } catch {
                        // ignore
                      }
                      setTimeout(() => orderSearchInputRef.current?.focus?.(), 120);
                    }}
                    aria-label="Search"
                  >
                    <i className="fas fa-search me-2"></i>Search
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={() => openCreateModal()}
                    disabled={saving || !!deletingId}
                    aria-label="Tạo đơn"
                  >
                    <i className="fas fa-plus me-2"></i>Tạo đơn
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => openMobileFilterSheet()}
                    aria-label="Lọc"
                  >
                    <i className="fas fa-sliders me-2"></i>Lọc
                  </button>
                </div>

                {/* Search palette overlay */}
                {searchPaletteOpen && (
                  <div
                    className="orders-search-palette-root"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => {
                      addSearchHistory(searchPaletteQuery);
                      closeSearchPalette();
                    }}
                  >
                    <div
                      className="orders-search-palette"
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => {
                        const t = e.touches && e.touches[0];
                        if (!t) return;
                        pullToSearchRef.current = { active: true, startY: t.clientY, startX: t.clientX, fired: false };
                      }}
                      onTouchMove={(e) => {
                        const s = pullToSearchRef.current;
                        if (!s?.active || s.fired) return;
                        const t = e.touches && e.touches[0];
                        if (!t) return;
                        const dy = t.clientY - s.startY;
                        const dx = t.clientX - s.startX;
                        if (Math.abs(dx) > 24) return;
                        if (dy > 90) {
                          s.fired = true;
                          addSearchHistory(searchPaletteQuery);
                          closeSearchPalette();
                        }
                      }}
                      onTouchEnd={() => {
                        pullToSearchRef.current = { active: false, startY: 0, startX: 0, fired: false };
                      }}
                    >
                      <div className="orders-search-palette-header">
                        <div className="fw-semibold">Tìm nhanh</div>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { addSearchHistory(searchPaletteQuery); closeSearchPalette(); }} aria-label="Đóng">
                          <i className="fas fa-xmark"></i>
                        </button>
                      </div>

                      <div className="orders-search-palette-body">
                        <div className="input-group">
                          <span className="input-group-text"><i className="fas fa-search"></i></span>
                          <input
                            ref={searchPaletteInputRef}
                            type="text"
                            className="form-control"
                            value={searchPaletteQuery}
                            onChange={(e) => {
                              const v = e.target.value;
                              setSearchPaletteQuery(v);
                              setOrderSearchQuery(v);
                            }}
                            placeholder="Nhập tên / SĐT…"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addSearchHistory(searchPaletteQuery);
                                closeSearchPalette();
                              }
                            }}
                          />
                          {!!String(searchPaletteQuery || '').trim() && (
                            <button type="button" className="btn btn-outline-secondary" onClick={() => { setSearchPaletteQuery(''); setOrderSearchQuery(''); }}>
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </div>

                        {Array.isArray(searchHistory) && searchHistory.length > 0 && (
                          <div className="mt-3">
                            <div className="text-muted small mb-2">Gần đây</div>
                            <div className="orders-chip-row" style={{ marginTop: 0 }}>
                              {searchHistory.slice(0, 8).map((q) => (
                                <button
                                  key={q}
                                  type="button"
                                  className="orders-chip"
                                  onClick={() => { setSearchPaletteQuery(q); setOrderSearchQuery(q); addSearchHistory(q); closeSearchPalette(); }}
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3">
                          <div className="text-muted small mb-2">Filter nhanh</div>
                          <div className="orders-filter-chip-grid">
                            <button type="button" className={`orders-filter-chip ${pinnedOnly ? 'active' : ''}`} onClick={() => { setOrderSearchQuery(''); setSearchPaletteQuery(''); setOverdueOnly(false); setTodayOnly(false); setPinnedOnly((v) => !v); closeSearchPalette(); }}>
                              <i className="fas fa-star me-2"></i>Ưu tiên
                            </button>
                            <button type="button" className={`orders-filter-chip ${todayOnly ? 'active' : ''}`} onClick={() => { setOrderSearchQuery(''); setSearchPaletteQuery(''); setOverdueOnly(false); setPinnedOnly(false); setTodayOnly((v) => !v); closeSearchPalette(); }}>
                              <i className="fas fa-calendar me-2"></i>Hôm nay
                            </button>
                            <button type="button" className={`orders-filter-chip ${overdueOnly ? 'active' : ''}`} onClick={() => { setOrderSearchQuery(''); setSearchPaletteQuery(''); setOverdueOnly((v) => !v); if (!overdueOnly) { setFilterMonth(''); setFilterStatus('pending'); } closeSearchPalette(); }}>
                              <i className="fas fa-triangle-exclamation me-2"></i>Chậm
                            </button>
                            <button type="button" className={`orders-filter-chip ${!filterStatus && !overdueOnly && !pinnedOnly && !todayOnly ? 'active' : ''}`} onClick={() => { setOrderSearchQuery(''); setSearchPaletteQuery(''); setOverdueOnly(false); setPinnedOnly(false); setTodayOnly(false); setFilterStatus(''); closeSearchPalette(); }}>
                              Tất cả
                            </button>
                            {ORDER_STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`orders-filter-chip ${filterStatus === opt.value && !overdueOnly ? 'active' : ''}`}
                                onClick={() => { setOrderSearchQuery(''); setSearchPaletteQuery(''); setOverdueOnly(false); setPinnedOnly(false); setTodayOnly(false); setFilterStatus(opt.value); if (opt.value === 'draft') setFilterMonth(''); closeSearchPalette(); }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="orders-search-palette-hint text-muted small">
                        Tip: Giữ nút Search để mở • Vuốt xuống để đóng
                      </div>
                    </div>
                  </div>
                )}

                {/* Desktop table */}
                <div className="d-none d-md-block">
                  <div className="table-responsive orders-table-wrap mt-3">
                    <table className="table orders-table table-hover align-middle mb-0">
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
                      {ordersToRender.map(order => (
                        <tr
                          key={order.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => openOrderInspector(order)}
                          title="Xem chi tiết"
                        >
                          <td>
                            <div className="fw-semibold">{order.customer_name}</div>
                            {(order?.note || '').trim() && (
                              <div className="text-muted small" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                <span className="fw-semibold">Ghi chú:</span> {(order.note || '').trim()}
                              </div>
                            )}
                          </td>
                          <td>{order.phone}</td>
                          <td>
                            {(() => {
                              const rows = getOrderItemRows(order);
                              if (!rows.length) return getOrderProductSummary(order);
                              return (
                                <div className="d-grid gap-1">
                                  {rows.map((r, idx) => (
                                    <div key={idx} className="small" style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.2 }}>
                                      <span className="text-muted me-1">{idx + 1}.</span>
                                      <span className="fw-semibold">{r.name}</span>{' '}
                                      <span className="text-muted">x{r.qty}</span>
                                      {Number(r.unitPrice) > 0 && (
                                        <span className="text-muted">{' '}• {formatVND(r.unitPrice)}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                          <td>{getOrderTotalQty(order)}</td>
                          <td className="fw-semibold">{formatVND(getOrderTotalMoney(order))}</td>
                          <td>
                            <div className="d-flex align-items-center gap-1 flex-wrap">
                              <span className={`badge ${getStatusBadgeClass(order.status)}`}>{getStatusLabel(order.status)}</span>
                              {isOverduePending(order) && (
                                <span className="badge bg-danger" title={`Chờ xử lý quá ${OVERDUE_PENDING_DAYS} ngày`}>
                                  ⚠ Chậm {getOrderAgeDays(order)}d
                                </span>
                              )}
                              {isDraftExpiringSoon(order) && (
                                <span className="badge bg-warning text-dark" title={`Đơn nháp sẽ tự hủy sau ${DRAFT_AUTO_DELETE_DAYS} ngày`}>
                                  ⏳ Còn {getDraftRemainingDays(order)}d
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{formatDateTime(order.created_at)}</td>
                          <td>
                            <div className="d-flex gap-2 justify-content-end">
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={(e) => { e.stopPropagation(); handleCopyOrder(order); }} disabled={saving || !!deletingId || updatingId === order.id}>
                                <i className="fas fa-copy"></i>
                              </button>
                              <select
                                className="form-select form-select-sm orders-status-quick"
                                defaultValue=""
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const v = String(e.target.value || '').trim();
                                  e.target.value = '';
                                  if (!v) return;
                                  updateOrderStatus(order, v);
                                }}
                                disabled={saving || !!deletingId || updatingId === order.id}
                                aria-label="Đổi trạng thái"
                              >
                                <option value="">Status…</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="done">Done</option>
                                <option value="paid">Paid</option>
                                <option value="canceled">Hủy</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))}
