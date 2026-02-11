
          {/* Mobile sticky context header */}
          <div
            className={`orders-context-header d-md-none ${mobileContextHeaderVisible ? 'visible' : ''}`}
            title="Vuốt trái/phải để đổi tháng"
            onTouchStartCapture={handleOrdersMonthSwipeStart}
            onTouchMoveCapture={handleOrdersMonthSwipeMove}
            onTouchEndCapture={handleOrdersMonthSwipeEnd}
            onTouchCancelCapture={handleOrdersMonthSwipeCancel}
            onPointerDownCapture={handleOrdersMonthSwipePointerDown}
            onPointerMoveCapture={handleOrdersMonthSwipePointerMove}
            onPointerUpCapture={handleOrdersMonthSwipePointerUp}
            onPointerCancelCapture={handleOrdersMonthSwipePointerCancel}
          >
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

            {selectedOrderIds?.size > 0 && (
              <div className="alert alert-secondary d-flex align-items-center justify-content-between gap-2 mt-3 mb-0" role="alert">
                <div style={{ minWidth: 0 }}>
                  <i className="fas fa-check-square me-2"></i>
                  Đã chọn <strong>{selectedOrderIds.size}</strong> đơn
                </div>
                <div className="d-flex flex-wrap gap-2 justify-content-end">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => clearSelectedOrders()} disabled={bulkBusy}>
                    Bỏ chọn
                  </button>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 170 }}
                    defaultValue=""
                    onChange={(e) => {
                      const v = String(e.target.value || '').trim();
                      e.target.value = '';
                      if (!v) return;
                      bulkUpdateSelectedStatus(v);
                    }}
                    disabled={bulkBusy}
                    aria-label="Đổi trạng thái hàng loạt"
                  >
                    <option value="">Đổi status…</option>
                    {ORDER_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => bulkDeleteSelectedOrders()} disabled={bulkBusy || saving || !!deletingId}>
                    <i className="fas fa-trash me-2"></i>Xóa
                  </button>
                </div>
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
                          <th style={{ width: 40 }}></th>
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
                            <td><div className="admin-skeleton-line w-30"></div></td>
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
