
      return (
        <div className="product-manager">
          <Loading show={saving || !!deletingId || !!updatingId} />

          {!!monthSwipeHint && (
            <div
              aria-hidden="true"
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                top: 84,
                zIndex: 1060,
                pointerEvents: 'none',
                opacity: 0.15 + 0.55 * monthSwipeHintOpacity,
                transform: 'translateZ(0)',
              }}
            >
              <div className="d-flex justify-content-center">
                <div className="px-3 py-2 rounded-pill bg-dark text-white shadow-sm" style={{ fontSize: 13 }}>
                  {monthSwipeDx > 0 ? '←' : '→'} {monthSwipeHint}{monthSwipeTargetMonth ? ` · ${monthSwipeTargetMonth}` : ''}
                </div>
              </div>
            </div>
          )}

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

            <div
              className="orders-filterbar mt-3 d-flex flex-wrap gap-2 align-items-center"
              style={{
                touchAction: 'pan-y',
                transform: `translateX(${monthSwipeDx}px)`,
                transition: monthSwipeAnimating ? 'transform 220ms ease' : 'none',
                willChange: 'transform',
              }}
              onTouchStartCapture={handleOrdersMonthSwipeStart}
              onTouchMoveCapture={handleOrdersMonthSwipeMove}
              onTouchEndCapture={handleOrdersMonthSwipeEnd}
              onTouchCancelCapture={handleOrdersMonthSwipeCancel}
              onPointerDownCapture={handleOrdersMonthSwipePointerDown}
              onPointerMoveCapture={handleOrdersMonthSwipePointerMove}
              onPointerUpCapture={handleOrdersMonthSwipePointerUp}
              onPointerCancelCapture={handleOrdersMonthSwipePointerCancel}
            >
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
                {isSearchActive
                  ? 'Search bỏ qua filter'
                  : (overdueOnly
                    ? 'Đang xem đơn chậm'
                    : (filterStatus
                      ? `Lọc: ${getStatusLabel(filterStatus)}`
                      : (isMobileViewport ? 'Vuốt trái/phải để đổi tháng' : '')
                    )
                  )
                }
              </div>
            </div>
          </div>
