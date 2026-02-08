                      onClick={() => {
                        if (swipeConsumeClickRef.current) {
                          swipeConsumeClickRef.current = false;
                          return;
                        }
                        openOrderInspector(order);
                      }}
                      onPointerDown={(e) => {
                        if (mobileSheetOpen || mobileFilterSheetOpen || statusPopoverOpen) return;
                        if (e.button != null && e.button !== 0) return;
                        const id = String(order.id);
                        swipeConsumeClickRef.current = false;
                        swipeRef.current = { active: true, id, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, lock: null, pointerId: e.pointerId, captured: false };
                        setSwipePreview((p) => (p?.id === id ? p : { id, dir: null }));

                        // Reset swipe visuals
                        try {
                          e.currentTarget.classList.remove('swiping');
                          e.currentTarget.style.setProperty('--swipe-x', '0px');
                          e.currentTarget.style.setProperty('--swipe-p', '0');
                          e.currentTarget.style.setProperty('--swipe-l', '0');
                          e.currentTarget.style.setProperty('--swipe-r', '0');
                        } catch {}

                        // Prefetch detail if user pauses on the card (makes drawer open instantly)
                        try {
                          if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
                        } catch {}
                        prefetchOrderIdRef.current = id;
                        prefetchTimerRef.current = setTimeout(async () => {
                          const targetId = prefetchOrderIdRef.current;
                          if (!targetId) return;
                          try {
                            if (orderDetailCacheRef.current?.has?.(targetId)) return;
                            const full = await fetchOrderById(targetId);
                            if (full && typeof full === 'object') {
                              orderDetailCacheRef.current?.set?.(targetId, full);
                            }
                          } catch {
                            // ignore
                          }
                        }, 150);
                      }}
                      onPointerMove={(e) => {
                        const s = swipeRef.current;
                        if (!s?.active || String(s.id) !== String(order.id)) return;
                        const dx = (e.clientX - s.startX);
                        const dy = (e.clientY - s.startY);
                        s.dx = dx;
                        s.dy = dy;

                        if (Math.abs(dx) > 14 || Math.abs(dy) > 14) {
                          try {
                            if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
                          } catch {}
                          prefetchTimerRef.current = null;
                          prefetchOrderIdRef.current = null;
                        }
                        if (!s.lock) {
                          const adx = Math.abs(dx);
                          const ady = Math.abs(dy);
                          if (adx > 10 || ady > 10) {
                            s.lock = (adx > ady * 1.2) ? 'x' : 'y';
                            if (s.lock === 'x' && !s.captured) {
                              try {
                                e.currentTarget.setPointerCapture(e.pointerId);
                                s.captured = true;
                              } catch {}
                            }
                          }
                        }
                        if (s.lock !== 'x') {
                          try {
                            e.currentTarget.classList.remove('swiping');
                            e.currentTarget.style.setProperty('--swipe-x', '0px');
                            e.currentTarget.style.setProperty('--swipe-p', '0');
                            e.currentTarget.style.setProperty('--swipe-l', '0');
                            e.currentTarget.style.setProperty('--swipe-r', '0');
                          } catch {}
                          if (Math.abs(dy) > 24) {
                            setSwipePreview((p) => (p?.id === s.id ? { id: s.id, dir: null } : p));
                          }
                          return;
                        }

                        const canRight = !!getSwipeTargetStatus(order?.status, 'right');
                        const canLeft = !!getSwipeTargetStatus(order?.status, 'left');

                        // Lock X: visualize swipe (card follows finger + labels reveal)
                        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
                        const rawClampedDx = clamp(dx, -140, 140);
                        const clampedDx = (rawClampedDx > 0 && !canRight)
                          ? rawClampedDx * 0.35
                          : ((rawClampedDx < 0 && !canLeft) ? rawClampedDx * 0.35 : rawClampedDx);
                        const progress = clamp(Math.abs(clampedDx) / 88, 0, 1);
                        try {
                          e.currentTarget.classList.add('swiping');
                          e.currentTarget.style.setProperty('--swipe-x', `${clampedDx}px`);
                          e.currentTarget.style.setProperty('--swipe-p', String(progress));
                          // dx>0 reveals LEFT side; dx<0 reveals RIGHT side
                          e.currentTarget.style.setProperty('--swipe-l', (clampedDx > 0 && canRight) ? String(progress) : '0');
                          e.currentTarget.style.setProperty('--swipe-r', (clampedDx < 0 && canLeft) ? String(progress) : '0');
                        } catch {}
                        if (Math.abs(clampedDx) > 12) swipeConsumeClickRef.current = true;

                        if (dx > 72 && canRight) setSwipePreview({ id: s.id, dir: 'right' });
                        else if (dx < -72 && canLeft) setSwipePreview({ id: s.id, dir: 'left' });
                        else setSwipePreview({ id: s.id, dir: null });
                      }}
                      onPointerCancel={(e) => {
                        try {
                          if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
                        } catch {}
                        prefetchTimerRef.current = null;
                        prefetchOrderIdRef.current = null;
                        const s = swipeRef.current;
                        try {
                          if (s?.captured && s?.pointerId != null) e.currentTarget.releasePointerCapture(s.pointerId);
                        } catch {}
                        swipeRef.current = { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0, lock: null, pointerId: null, captured: false };
                        setSwipePreview({ id: null, dir: null });

                        // Reset swipe visuals
                        try {
                          e.currentTarget.classList.remove('swiping');
                          e.currentTarget.style.setProperty('--swipe-x', '0px');
                          e.currentTarget.style.setProperty('--swipe-p', '0');
                          e.currentTarget.style.setProperty('--swipe-l', '0');
                          e.currentTarget.style.setProperty('--swipe-r', '0');
                        } catch {}
                      }}
                      onPointerUp={(e) => {
                        try {
                          if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
                        } catch {}
                        prefetchTimerRef.current = null;
                        prefetchOrderIdRef.current = null;
                        const s = swipeRef.current;
                        if (!s?.active || String(s.id) !== String(order.id)) {
                          setSwipePreview({ id: null, dir: null });
                          return;
                        }
                        try {
                          if (s?.captured && s?.pointerId != null) {
                            e.currentTarget.releasePointerCapture(s.pointerId);
                          }
                        } catch {}
                        swipeRef.current = { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0, lock: null, pointerId: null, captured: false };

                        const dx = Number(s.dx) || 0;
                        const adx = Math.abs(dx);
                        const lockedX = s.lock === 'x';
                        const status = normalizeOrderStatus(order?.status);
                        setSwipePreview({ id: null, dir: null });

                        // Snap visuals back
                        try {
                          e.currentTarget.classList.remove('swiping');
                          e.currentTarget.style.setProperty('--swipe-x', '0px');
                          e.currentTarget.style.setProperty('--swipe-p', '0');
                          e.currentTarget.style.setProperty('--swipe-l', '0');
                          e.currentTarget.style.setProperty('--swipe-r', '0');
                        } catch {}

                        if (lockedX && adx > 12) {
                          swipeConsumeClickRef.current = true;
                        }

                        if (!lockedX || adx < 88) return;
                        e.preventDefault();
                        e.stopPropagation();

                        const target = dx > 0
                          ? getSwipeTargetStatus(order?.status, 'right')
                          : getSwipeTargetStatus(order?.status, 'left');
                        const next = normalizeOrderStatus(target);
                        if (!next || next === status) return;
                        updateOrderStatus(order, next);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openOrderInspector(order);
                        }
                      }}
                      title="Xem chi tiết"
                    >
                      <div className="orders-mobile-swipe-bg" aria-hidden="true">
                        <div className="orders-mobile-swipe-bg-left">
                          <div className="orders-mobile-swipe-label">
                            {(() => {
                              const target = getSwipeTargetStatus(order?.status, 'right');
                              const meta = getSwipeLabelMeta(target);
                              const text = meta?.label || String(target || '').trim();
                              if (!text) return null;
                              return (
                                <>
                                  <i className={`fas ${meta.icon || 'fa-circle'}`}></i>
                                  {text}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="orders-mobile-swipe-bg-right">
                          <div className="orders-mobile-swipe-label">
                            {(() => {
                              const target = getSwipeTargetStatus(order?.status, 'left');
                              const meta = getSwipeLabelMeta(target);
                              const text = meta?.label || String(target || '').trim();
                              if (!text) return null;
                              return (
                                <>
                                  <i className={`fas ${meta.icon || 'fa-circle'}`}></i>
                                  {text}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className={`card orders-mobile-card ${recentlyUpdatedIds?.[String(order.id)] ? 'order-recent-updated' : ''}`}>
                        <div className="card-body p-3 order-card-mobile">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div className="flex-grow-1" style={{ minWidth: 0 }}>
                            <div className="fw-semibold order-customer-name">{order.customer_name}</div>
                            <div
                              className="fw-bold font-monospace order-phone"
                              role="button"
                              tabIndex={0}
                              onPointerDown={(e) => startPhoneLongPress(e, order.phone)}
                              onPointerMove={cancelPhoneLongPress}
                              onPointerUp={(e) => finishPhoneLongPress(e, order.phone)}
                              onPointerCancel={cancelPhoneLongPress}
                              onPointerLeave={cancelPhoneLongPress}
                              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (phoneLongPressFiredRef.current) {
                                  phoneLongPressFiredRef.current = false;
                                  return;
                                }
                                handlePhoneCopy(order.phone);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handlePhoneCopy(order.phone);
                                }
                              }}
                              title="Chạm để copy • Giữ để gọi"
                            >
                              {order.phone}
                            </div>
                            {Number(order?.split_seq ?? 0) > 0 && (
                              <div className="text-muted small">Đợt {order.split_seq}</div>
                            )}
                            {(() => {
                              const addr = getOrderAddressText(order);
                              if (!addr) return null;
                              const expanded = expandedOrderIds.has(String(order.id));
                              const longText = addr.length > 84 || getOrderNoteText(order).length > 84;
                              return (
                                <>
                                  <div className={`text-muted small order-address ${!expanded ? 'order-text-collapsed' : ''}`}>
                                    {addr}
                                  </div>
                                  {longText && (
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 order-expand-btn"
                                      onClick={(e) => { e.stopPropagation(); toggleOrderExpanded(order.id); }}
                                    >
                                      {expanded ? 'Thu gọn' : 'Xem thêm'}
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                            {(() => {
                              const note = getOrderNoteText(order);
                              if (!note) return null;
                              const expanded = expandedOrderIds.has(String(order.id));
                              const addrLen = getOrderAddressText(order).length;
                              const longText = addrLen > 84 || note.length > 84;
                              return (
                                <>
                                  <div className={`text-muted small order-note ${!expanded ? 'order-text-collapsed' : ''}`}>
                                    <span className="fw-semibold">Ghi chú:</span> {note}
                                  </div>
                                  {longText && addrLen <= 0 && (
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 order-expand-btn"
                                      onClick={(e) => { e.stopPropagation(); toggleOrderExpanded(order.id); }}
                                    >
                                      {expanded ? 'Thu gọn' : 'Xem thêm'}
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <div className="d-flex align-items-start gap-1 flex-shrink-0">
                            <button
                              type="button"
                              className={`btn btn-sm btn-link order-pin-btn ${pinnedOrderIds.has(String(order.id)) ? 'active' : ''}`}
                              onClick={(e) => { e.stopPropagation(); togglePinnedOrder(order.id); }}
                              title={pinnedOrderIds.has(String(order.id)) ? 'Bỏ ghim' : 'Ghim'}
                              aria-label={pinnedOrderIds.has(String(order.id)) ? 'Bỏ ghim' : 'Ghim'}
                            >
                              <i className={pinnedOrderIds.has(String(order.id)) ? 'fas fa-star' : 'far fa-star'}></i>
                            </button>
                            {!!syncingIds?.[String(order.id)] && (
                              <span className="badge bg-info text-dark orders-sync-badge" title="Đang đồng bộ" aria-label="Đang đồng bộ">
                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                Sync
                              </span>
                            )}
                            <button
                              type="button"
                              className={`badge ${getStatusBadgeClass(order.status)} order-status-badge-btn`}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                statusPopoverLongPressFiredRef.current = false;
                                try {
                                  if (statusPopoverLongPressTimerRef.current) clearTimeout(statusPopoverLongPressTimerRef.current);
                                } catch {}
                                statusPopoverLongPressTimerRef.current = setTimeout(() => {
                                  statusPopoverLongPressFiredRef.current = true;
                                  openStatusPopover(order, e.currentTarget);
                                }, 420);
                              }}
                              onPointerUp={(e) => {
                                e.stopPropagation();
                                try {
                                  if (statusPopoverLongPressTimerRef.current) clearTimeout(statusPopoverLongPressTimerRef.current);
                                } catch {}
                                statusPopoverLongPressTimerRef.current = null;
                              }}
                              onPointerCancel={(e) => {
                                e.stopPropagation();
                                try {
                                  if (statusPopoverLongPressTimerRef.current) clearTimeout(statusPopoverLongPressTimerRef.current);
                                } catch {}
                                statusPopoverLongPressTimerRef.current = null;
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (statusPopoverLongPressFiredRef.current) {
                                  statusPopoverLongPressFiredRef.current = false;
                                  return;
                                }
                                if (statusPopoverOpen && String(statusPopoverOrder?.id) === String(order.id)) closeStatusPopover();
                                else openStatusPopover(order, e.currentTarget);
                              }}
                              title="Đổi trạng thái nhanh"
                            >
                              {getStatusLabel(order.status)}
                            </button>
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
                        </div>

                        <div className="mt-2 small">
                          <div>
                            <div className="text-muted">Sản phẩm:</div>
                            {(() => {
                              const rows = getOrderItemRows(order);
                              if (!rows.length) {
                                return (
                                  <div className="fw-semibold" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                    {getOrderProductSummary(order)}
                                  </div>
                                );
                              }
                              return (
                                <div className="mt-1">
                                  {rows.map((r, idx) => (
                                    <div key={idx} className="d-flex justify-content-between gap-2" style={{ lineHeight: 1.25 }}>
                                      <div className="fw-semibold" style={{ minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word', flex: 1 }}>
                                        <span className="text-muted me-1">{idx + 1}.</span>
                                        {r.name}
                                      </div>
                                      <div className="text-muted small text-end text-nowrap" style={{ flexShrink: 0 }}>
                                        x{r.qty}{Number(r.unitPrice) > 0 ? ` • ${formatVND(r.unitPrice)}` : ''}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                          {(getOrderAdjustmentMoney(order) !== 0 || getOrderAdjustmentSummaryText(order)) && (
                            <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                              <span className="text-muted">Điều chỉnh:</span>{' '}
                              <span className="fw-semibold">{formatVND(getOrderAdjustmentMoney(order))}</span>
                              {getOrderAdjustmentSummaryText(order) ? (
                                <span className="text-muted">{' '}({getOrderAdjustmentSummaryText(order)})</span>
                              ) : null}
                            </div>
                          )}
                          <div className="d-flex justify-content-between">
                            <span className="text-muted">Tổng tiền</span>
                            <span className="fw-bold">{formatVND(getOrderTotalMoney(order))}</span>
                          </div>
                          <div className="text-muted"><span>Thời gian:</span> {formatDateTime(order.created_at)}</div>
                        </div>

                        <div className="mt-3 d-flex gap-2 align-items-center order-card-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={(e) => { e.stopPropagation(); handleCopyOrder(order); }}
                            disabled={saving || !!deletingId || updatingId === order.id}
                          >
                            <i className="fas fa-copy me-1"></i>Copy
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-dark orders-mobile-action"
                            onClick={(e) => { e.stopPropagation(); openMobileSheet(order); }}
                            disabled={saving || !!deletingId || updatingId === order.id}
                            aria-label="Mở thao tác nhanh"
                          >
                            <i className="fas fa-bolt me-1"></i>Thao tác
                          </button>
                        </div>
                        </div>
                      </div>
                      </div>
                  ))}

                  <div ref={mobileListSentinelRef} className="orders-mobile-sentinel" aria-hidden="true" />
                  {Array.isArray(ordersToRender) && mobileOrdersToRender.length < ordersToRender.length && (
                    <div className="text-center text-muted small py-2">Đang tải thêm…</div>
                  )}
                </div>

                {/* Inline status popover */}
                {statusPopoverOpen && statusPopoverOrder && (
                  <div className="orders-status-popover-root" role="dialog" aria-modal="true" onClick={() => closeStatusPopover()}>
                    <div
                      className={`orders-status-popover ${statusPopoverPos?.placement || ''}`}
                      style={{ left: statusPopoverPos.left, top: statusPopoverPos.top }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="orders-status-popover-title">
                        <div className="fw-semibold" style={{ minWidth: 0 }}>
                          {statusPopoverOrder.customer_name || 'Đơn hàng'}
                        </div>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => closeStatusPopover()} aria-label="Đóng">
                          <i className="fas fa-xmark"></i>
                        </button>
                      </div>
                      <div className="orders-status-popover-grid">
                        {ORDER_STATUS_OPTIONS.map((opt) => {
                          const active = normalizeOrderStatus(statusPopoverOrder.status) === normalizeOrderStatus(opt.value);
                          const busy = saving || !!deletingId || updatingId === statusPopoverOrder.id;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              className={`orders-status-chip ${active ? 'active' : ''}`}
                              onClick={() => {
                                if (active) return;
                                updateOrderStatus(statusPopoverOrder, opt.value);
                                closeStatusPopover();
                              }}
                              disabled={busy}
