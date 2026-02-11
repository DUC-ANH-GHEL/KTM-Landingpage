                      </tbody>
                    </table>
                  </div>
                </div>

                {!isSearchActive && ordersHasMore && !overdueOnly && (
                  <div className="d-flex justify-content-center mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={loadMoreOrders}
                      disabled={loading || loadingMoreOrders}
                    >
                      {loadingMoreOrders ? (
                        <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Đang tải thêm...</>
                      ) : (
                        <><i className="fas fa-angle-down me-2"></i>Tải thêm đơn</>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <AdminDrawer
            open={inspectorOpen}
            title={(() => {
              const o = inspectorOrder;
              const id = o?.id ? `#${o.id}` : '';
              const st = o?.status ? `• ${getStatusLabel(o.status)}` : '';
              return `Đơn hàng ${id} ${st}`.trim();
            })()}
            subtitle={(() => {
              const o = inspectorOrder;
              const who = String(o?.customer_name || '').trim();
              const phone = String(o?.phone || '').trim();
              const when = o?.created_at ? formatDateTime(o.created_at) : '';
              return [who || phone || null, when || null].filter(Boolean).join(' • ');
            })()}
            onClose={closeOrderInspector}
            footer={(
              <div className="d-flex flex-wrap gap-2 justify-content-between">
                {inspectorEditMode ? (
                  <>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          setInspectorEditMode(false);
                          setEditingId(null);
                          resetOrderForm('');
                          setShowPhoneHistory(false);
                          setSplitDeliverNow([]);
                        }}
                        disabled={saving || splitting}
                      >
                        <i className="fas fa-xmark me-2"></i>Hủy sửa
                      </button>

                      {!!editingId && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary fw-semibold"
                          onClick={() => splitOrderDeliverNow('drawer')}
                          disabled={saving || splitting}
                          title="Chọn sản phẩm giao đợt 1 và tách phần còn lại sang đơn chờ hàng"
                        >
                          {splitting ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span>Đang tách...</>
                          ) : (
                            <><i className="fas fa-random me-2"></i>Tách giao ngay</>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-warning fw-semibold"
                        onClick={() => saveOrder({ mode: 'close', origin: 'drawer' })}
                        disabled={saving || splitting || !orderFieldIssues.canSubmit}
                        style={{ boxShadow: '0 4px 12px rgba(255,193,7,0.25)' }}
                      >
                        {saving ? (
                          <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</>
                        ) : (
                          <><i className="fas fa-check me-2"></i>Lưu</>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => inspectorOrder && handleCopyOrder(inspectorOrder)}
                        disabled={!inspectorOrder || inspectorLoading || saving || !!deletingId}
                      >
                        <i className="fas fa-copy me-2"></i>Copy
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => inspectorOrder && editOrder(inspectorOrder)}
                        disabled={!inspectorOrder || inspectorLoading || saving || !!deletingId}
                      >
                        <i className="fas fa-pen me-2"></i>Sửa
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => inspectorOrder && deleteOrder(inspectorOrder.id)}
                        disabled={!inspectorOrder || inspectorLoading || saving || !!deletingId}
                      >
                        <i className="fas fa-trash me-2"></i>Xóa
                      </button>
                    </div>
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                      <select
                        className="form-select form-select-sm"
                        defaultValue=""
                        onChange={(e) => {
                          const v = String(e.target.value || '').trim();
                          e.target.value = '';
                          if (!v) return;
                          inspectorOrder && updateOrderStatus(inspectorOrder, v);
                        }}
                        disabled={!inspectorOrder || inspectorLoading || saving || !!deletingId || updatingId === inspectorOrder?.id}
                        aria-label="Đổi trạng thái"
                        style={{ minWidth: 140 }}
                      >
                        <option value="">Status…</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="done">Done</option>
                        <option value="paid">Paid</option>
                        <option value="canceled">Hủy</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}
          >
            {inspectorEditMode ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveOrder({ mode: 'close', origin: 'drawer' });
                }}
              >
                <div className="admin-drawer-section">
                  <h6><i className="fas fa-pen me-2 text-warning"></i>Chỉnh sửa</h6>
                  {renderOrderFormFields()}
                </div>
              </form>
            ) : inspectorLoading ? (
              <div className="admin-drawer-section">
                <div className="text-muted small mb-2">Đang tải chi tiết…</div>
                <div className="d-flex align-items-center gap-2">
                  <span className="spinner-border spinner-border-sm text-warning" aria-hidden="true"></span>
                  <span className="text-muted">Vui lòng chờ</span>
                </div>
              </div>
            ) : inspectorError ? (
              <div className="alert alert-danger" role="alert">{inspectorError}</div>
            ) : !inspectorOrder ? (
              <div className="text-muted">Chưa có dữ liệu</div>
            ) : (
              <>
                <div className="admin-drawer-section">
                  <h6><i className="fas fa-circle-info me-2 text-warning"></i>Tổng quan</h6>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    <span className={`badge ${getStatusBadgeClass(inspectorOrder.status)}`}>{getStatusLabel(inspectorOrder.status)}</span>
                    {isOverduePending(inspectorOrder) && (
                      <span className="badge bg-danger" title={`Chờ xử lý quá ${OVERDUE_PENDING_DAYS} ngày`}>
                        ⚠ Chậm {getOrderAgeDays(inspectorOrder)}d
                      </span>
                    )}
                    {isDraftExpiringSoon(inspectorOrder) && (
                      <span className="badge bg-warning text-dark" title={`Đơn nháp sẽ tự hủy sau ${DRAFT_AUTO_DELETE_DAYS} ngày`}>
                        ⏳ Còn {getDraftRemainingDays(inspectorOrder)}d
                      </span>
                    )}
                  </div>
                  <div className="admin-kv">
                    <div className="k">Tổng tiền</div>
                    <div className="v">{formatVND(getOrderTotalMoney(inspectorOrder))}</div>
                    <div className="k">Số lượng</div>
                    <div className="v">{getOrderTotalQty(inspectorOrder)}</div>
                    <div className="k">Thời gian</div>
                    <div className="v">{formatDateTime(inspectorOrder.created_at)}</div>
                  </div>
                </div>

                <div className="admin-drawer-section">
                  <h6><i className="fas fa-user me-2 text-info"></i>Khách hàng</h6>
                  <div className="admin-kv">
                    <div className="k">Tên</div>
                    <div className="v">{inspectorOrder.customer_name || '—'}</div>
                    <div className="k">SĐT</div>
                    <div className="v" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="font-monospace">{inspectorOrder.phone || '—'}</span>
                      {!!String(inspectorOrder.phone || '').trim() && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => window.KTM.clipboard.writeText(String(inspectorOrder.phone || '').trim())}
                          title="Copy SĐT"
                        >
                          <i className="fas fa-copy"></i>
                        </button>
                      )}
                    </div>
                    <div className="k">Địa chỉ</div>
                    <div className="v">{inspectorOrder.address || '—'}</div>
                  </div>
                  {(inspectorOrder?.note || '').trim() && (
                    <div className="mt-2 text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      <span className="fw-semibold">Ghi chú:</span> {(inspectorOrder.note || '').trim()}
                    </div>
                  )}
                </div>

                <div className="admin-drawer-section">
                  <h6><i className="fas fa-boxes-stacked me-2 text-primary"></i>Sản phẩm</h6>
                  {(() => {
                    const rows = getOrderItemRows(inspectorOrder);
                    if (!rows.length) {
                      return (
                        <div className="fw-semibold" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {getOrderProductSummary(inspectorOrder) || '—'}
                        </div>
                      );
                    }
                    return (
                      <div className="d-grid gap-2">
                        {rows.map((r, idx) => (
                          <div key={idx} className="d-flex justify-content-between gap-2">
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="fw-semibold" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                <span className="text-muted me-1">{idx + 1}.</span>{r.name}
                              </div>
                              {r.variant ? <div className="text-muted small">{r.variant}</div> : null}
                            </div>
                            <div className="text-muted small text-end text-nowrap" style={{ flexShrink: 0 }}>
                              x{r.qty}{Number(r.unitPrice) > 0 ? ` • ${formatVND(r.unitPrice)}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {(getOrderAdjustmentMoney(inspectorOrder) !== 0 || getOrderAdjustmentSummaryText(inspectorOrder)) && (
                    <div className="mt-2" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      <span className="text-muted">Điều chỉnh:</span>{' '}
                      <span className="fw-semibold">{formatVND(getOrderAdjustmentMoney(inspectorOrder))}</span>
                      {getOrderAdjustmentSummaryText(inspectorOrder) ? (
                        <span className="text-muted">{' '}({getOrderAdjustmentSummaryText(inspectorOrder)})</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            )}
          </AdminDrawer>

          {/* Order create/edit modal */}
          {showModal && (
            <div className="modal show d-block order-modal" style={{ background: 'rgba(0,0,0,0.6)' }} role="dialog" aria-modal="true">
              <div className="modal-dialog modal-dialog-scrollable">
                <div className="modal-content" style={{ borderRadius: 16 }}>
                  <div className="modal-header" style={{ background: 'linear-gradient(135deg, #ffc107, #ffca2c)', border: 'none', borderRadius: '16px 16px 0 0' }}>
                    <h5 className="modal-title fw-bold text-dark mb-0">
                      <i className="fas fa-receipt me-2"></i>
                      {editingId ? 'Sửa đơn hàng' : 'Tạo đơn hàng'}
                    </h5>
                    <button type="button" className="btn-close" onClick={closeModal}></button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveOrder({ mode: 'close', origin: 'modal' });
                    }}
                  >
                    <div className="modal-body" ref={orderModalBodyRef}>
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label fw-semibold small text-muted mb-1">Tên khách hàng *</label>
                          <input
                            className="form-control"
                            value={form.customer_name}
                            onChange={e => setForm({ ...form, customer_name: e.target.value })}
                            placeholder="Nhập tên khách hàng"
                            required
                            style={{ borderRadius: 10, padding: 12 }}
                          />
                          {!!orderFieldIssues.nameError && (
                            <div className="form-text text-danger">{orderFieldIssues.nameError}</div>
                          )}
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small text-muted mb-1">Số điện thoại *</label>
                          <input
                            className="form-control"
                            type="tel"
                            inputMode="numeric"
                            id="order-phone-input"
                            value={form.phone}
                            onChange={e => handlePhoneChange(e.target.value)}
                            onBlur={handlePhoneBlur}
                            placeholder="Nhập số điện thoại"
                            required
                            style={{ borderRadius: 10, padding: 12 }}
                          />
                          {!!orderFieldIssues.phoneError && (
                            <div className="form-text text-danger">{orderFieldIssues.phoneError}</div>
                          )}

                          {!orderFieldIssues.phoneError && phoneMonthHistory.count > 0 && (
                            <div className="form-text text-warning d-flex align-items-center justify-content-between gap-2">
                              <span>
                                Khách này đã có {phoneMonthHistory.count} đơn trong tháng {phoneMonthHistory.monthKey}.
                              </span>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => setShowPhoneHistory((v) => !v)}
                              >
                                {showPhoneHistory ? 'Ẩn lịch sử' : 'Xem lịch sử'}
                              </button>
                            </div>
                          )}

                          {showPhoneHistory && phoneMonthHistory.orders.length > 0 && (
                            <div className="mt-2 border rounded-3 p-2" style={{ background: '#fff' }}>
                              <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                                <div className="small fw-semibold">Lịch sử đơn (cùng tháng)</div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => setShowPhoneHistory(false)}
                                >
                                  Ẩn
                                </button>
                              </div>
                              <div className="d-grid gap-2">
                                {phoneMonthHistory.orders.slice(0, 5).map((o) => (
                                  <div key={o.id} className="d-flex align-items-start justify-content-between gap-2">
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div className="small fw-semibold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        #{o.id} • <span className={`badge ${getStatusBadgeClass(o.status)}`}>{getStatusLabel(o.status)}</span>
                                      </div>
                                      <div className="text-muted small">{formatDateTime(o.created_at)} • {formatVND(getOrderTotalMoney(o))}</div>
                                      <div className="text-muted small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {getOrderProductSummary(o)}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() => {
                                        if (!confirm(`Mở đơn #${o.id}? Dữ liệu đang nhập sẽ mất.`)) return;
                                        editOrder(o);
                                      }}
                                    >
                                      Mở
                                    </button>
                                  </div>
                                ))}
                              </div>
                              {phoneMonthHistory.orders.length > 5 && (
                                <div className="text-muted small mt-2">Chỉ hiển thị 5 đơn gần nhất.</div>
                              )}
                            </div>
                          )}

                          {customerLookup?.status === 'loading' && (
                            <div className="form-text">Đang tìm khách theo SĐT...</div>
                          )}
                          {customerLookup?.status === 'found' && (
                            <div className="form-text text-success">Đã có khách, tự động điền thông tin.</div>
                          )}
                          {customerLookup?.status === 'not-found' && (
                            <div className="form-text text-muted">Chưa có khách, sẽ tạo mới khi lưu đơn.</div>
                          )}
                          {customerLookup?.status === 'error' && (
                            <div className="form-text text-danger">Không tra được khách (lỗi mạng/server).</div>
                          )}
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small text-muted mb-1">Trạng thái</label>
                          <select
                            className="form-select"
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value })}
                            style={{ borderRadius: 10, padding: 12 }}
                          >
                            <option value="draft">Đơn nháp</option>
                            <option value="pending">Chờ xử lý</option>
                            <option value="processing">Đang vận chuyển</option>
                            <option value="done">Hoàn thành</option>
                            <option value="paid">Đã nhận tiền</option>
                            <option value="canceled">Hủy đơn</option>
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-semibold small text-muted mb-1">Địa chỉ</label>
                          <input
                            className="form-control"
                            value={form.address}
                            onChange={e => setForm({ ...form, address: e.target.value })}
                            placeholder="Nhập địa chỉ (không bắt buộc)"
                            style={{ borderRadius: 10, padding: 12 }}
                          />
                          {!!orderFieldIssues.addressWarn && (
                            <div className="form-text text-warning">{orderFieldIssues.addressWarn}</div>
                          )}
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold small text-muted mb-1">Ghi chú đơn hàng</label>
                          <textarea
                            className="form-control"
                            value={form.note}
                            onChange={e => setForm({ ...form, note: e.target.value })}
                            placeholder="Ví dụ: Giao giờ hành chính / Gọi trước khi giao..."
                            rows={2}
                            style={{ borderRadius: 10, padding: 12, resize: 'vertical' }}
                          />
                        </div>

                        <div className="col-12">
                          <div className="d-flex align-items-center justify-content-between">
                            <label className="form-label fw-semibold small text-muted mb-1">Điều chỉnh giá (thêm/bớt)</label>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  adjustment_items: [
                                    ...(Array.isArray(prev.adjustment_items) ? prev.adjustment_items : [{ amount: '', note: '' }]),
                                    { amount: '', note: '' },
                                  ],
                                }));
                              }}
                            >
                              <i className="fas fa-plus me-2"></i>Thêm điều chỉnh
                            </button>
                          </div>

                          <div className="d-grid gap-2">
                            {normalizeAdjustmentFormItems(form.adjustment_items).map((adj, idx) => (
                              <div key={idx} className="row g-2 align-items-end">
                                <div className="col-12 col-md-3">
                                  <label className="form-label small text-muted mb-1">Số tiền</label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    className="form-control"
                                    value={adj.amount}
                                    onChange={(e) => {
                                      const nextAmount = e.target.value;
                                      setForm((prev) => {
                                        const arr = normalizeAdjustmentFormItems(prev.adjustment_items);
                                        arr[idx] = { ...arr[idx], amount: nextAmount };
                                        return { ...prev, adjustment_items: arr };
                                      });
                                    }}
                                    placeholder="+500000 hoặc -200000"
                                    style={{ borderRadius: 10, padding: 12 }}
                                  />
                                </div>
                                <div className="col-12 col-md-8">
                                  <label className="form-label small text-muted mb-1">Ghi chú</label>
                                  <input
                                    className="form-control"
                                    value={adj.note}
                                    onChange={(e) => {
                                      const nextNote = e.target.value;
                                      setForm((prev) => {
