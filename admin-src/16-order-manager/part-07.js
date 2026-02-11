            items: normalizedItems,
          };

          await window.KTM.api.putJSON(`${API_BASE}/api/orders/${orderId}`, payload, 'Lỗi cập nhật trạng thái');

          const key = String(orderId);
          const patchStatus = (o) => ({ ...(o || {}), status: nextStatus });
          const nextNorm = normalizeOrderStatus(nextStatus);

          setOrders((prev) => (
            Array.isArray(prev)
              ? prev.map((o) => (String(o?.id) === key ? patchStatus(o) : o))
              : prev
          ));

          // allOrders is the overdue snapshot (pending only). If status changes away from pending, remove it.
          setAllOrders((prev) => (
            Array.isArray(prev)
              ? prev.flatMap((o) => {
                  if (String(o?.id) !== key) return [o];
                  if (nextNorm === 'pending') return [patchStatus(o)];
                  return [];
                })
              : prev
          ));

          setDraftExpiringOrders((prev) => (
            Array.isArray(prev)
              ? (nextNorm === 'draft'
                  ? prev.map((o) => (String(o?.id) === key ? patchStatus(o) : o))
                  : prev.filter((o) => String(o?.id) !== key)
                )
              : prev
          ));

          setOrderSearchResults((prev) => (
            Array.isArray(prev)
              ? prev.map((o) => (String(o?.id) === key ? patchStatus(o) : o))
              : prev
          ));

          setPhoneHistoryOrders((prev) => (
            Array.isArray(prev)
              ? prev.map((o) => (String(o?.id) === key ? patchStatus(o) : o))
              : prev
          ));

          setInspectorOrder((prev) => (String(prev?.id) === key ? patchStatus(prev) : prev));
          setMobileSheetOrder((prev) => (String(prev?.id) === key ? patchStatus(prev) : prev));
          setStatusPopoverOrder((prev) => (String(prev?.id) === key ? patchStatus(prev) : prev));

          // If this order was in the offline sync queue, clear its syncing badge.
          setSyncingFor(orderId, false);
          markOrderRecentlyUpdated(orderId);

          if (options?.silentToast) return;
          if (options?.skipToastBatch) {
            if (typeof showToast === 'function') showToast('Đã cập nhật trạng thái', 'success', { durationMs: 4500 });
            return;
          }
          queueStatusToastEvent({
            orderId,
            prevStatus,
            nextStatus: normalizeOrderStatus(nextStatus),
          });
        } catch (err) {
          console.error(err);
          const isNetErr = !navigator.onLine || err?.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('failed to fetch');
          if (isNetErr && !options?.fromSync) {
            // Optimistic UI + queue for retry
            const key = String(orderId);
            const patchStatus = (o) => ({ ...(o || {}), status: nextStatus });
            const nextNorm = normalizeOrderStatus(nextStatus);

            setOrders((prev) => (
              Array.isArray(prev)
                ? prev.map((o) => (String(o?.id) === key ? patchStatus(o) : o))
                : prev
            ));
            setAllOrders((prev) => (
              Array.isArray(prev)
                ? prev.flatMap((o) => {
                    if (String(o?.id) !== key) return [o];
                    if (nextNorm === 'pending') return [patchStatus(o)];
                    return [];
                  })
                : prev
            ));
            setDraftExpiringOrders((prev) => (
              Array.isArray(prev)
                ? (nextNorm === 'draft'
                    ? prev.map((o) => (String(o?.id) === key ? patchStatus(o) : o))
                    : prev.filter((o) => String(o?.id) !== key)
                  )
                : prev
            ));
            setOrderSearchResults((prev) => (
              Array.isArray(prev)
                ? prev.map((o) => (String(o?.id) === key ? patchStatus(o) : o))
                : prev
            ));
            setPhoneHistoryOrders((prev) => (
              Array.isArray(prev)
                ? prev.map((o) => (String(o?.id) === key ? patchStatus(o) : o))
                : prev
            ));
            setInspectorOrder((prev) => (String(prev?.id) === key ? patchStatus(prev) : prev));
            setMobileSheetOrder((prev) => (String(prev?.id) === key ? patchStatus(prev) : prev));
            setStatusPopoverOrder((prev) => (String(prev?.id) === key ? patchStatus(prev) : prev));
            enqueueStatusSync(orderId, nextStatus, prevStatus);
            if (typeof showToast === 'function') showToast('Mất mạng/timeout • Đã xếp hàng đồng bộ', 'info', { durationMs: 6500 });
            return;
          }

          if (typeof showToast === 'function') showToast(err.message, 'danger');
          else alert(err.message);
        } finally {
          setUpdatingId(null);
        }
      };

      useEffect(() => {
        const onHotkey = (e) => {
          const key = e?.detail?.key;
          if (!key) return;

          if (key === '/') {
            setTimeout(() => {
              orderSearchInputRef.current?.focus?.();
            }, 0);
            return;
          }

          if (key === 'N' || key === 'n') {
            openCreateModal();
            return;
          }

          if ((key === 'j' || key === 'J' || key === 'k' || key === 'K') && inspectorOpen && inspectorOrder?.id) {
            const list = Array.isArray(ordersToRender) ? ordersToRender : [];
            const idx = list.findIndex((o) => String(o?.id) === String(inspectorOrder?.id));
            if (idx < 0) return;
            const dir = (key === 'j' || key === 'J') ? -1 : 1;
            const next = list[idx + dir];
            if (next) openOrderInspector(next);
          }
        };

        window.addEventListener('ktm-admin-hotkey', onHotkey);
        return () => window.removeEventListener('ktm-admin-hotkey', onHotkey);
      }, [ordersToRender, inspectorOpen, inspectorOrder]);

      const renderOrderFormFields = () => (
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
                          const arr = normalizeAdjustmentFormItems(prev.adjustment_items);
                          arr[idx] = { ...arr[idx], note: nextNote };
                          return { ...prev, adjustment_items: arr };
                        });
                      }}
                      placeholder="Ví dụ: thêm van 1 tay / giảm giá..."
                      style={{ borderRadius: 10, padding: 12 }}
                    />
                  </div>
                  <div className="col-12 col-md-1 d-flex">
                    <button
                      type="button"
                      className="btn btn-outline-danger w-100"
                      onClick={() => {
                        setForm((prev) => {
                          const arr = normalizeAdjustmentFormItems(prev.adjustment_items);
                          arr.splice(idx, 1);
                          return { ...prev, adjustment_items: arr.length ? arr : [{ amount: '', note: '' }] };
                        });
                      }}
                      disabled={saving || normalizeAdjustmentFormItems(form.adjustment_items).length <= 1}
                      title="Xóa điều chỉnh"
                      style={{ borderRadius: 10, padding: 12 }}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-text">Âm = giảm giá, dương = cộng thêm.</div>
            {!!orderFieldIssues.adjustmentAbnormalWarn && (
              <div className="form-text text-warning">{orderFieldIssues.adjustmentAbnormalWarn}</div>
            )}
            {!!orderFieldIssues.adjustmentNoteWarn && (
              <div className="form-text text-warning">{orderFieldIssues.adjustmentNoteWarn}</div>
            )}
          </div>
          <div className="col-12 col-md-8">
            <div className="d-flex align-items-center justify-content-between">
              <label className="form-label fw-semibold small text-muted mb-1">Sản phẩm *</label>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    items: [...(Array.isArray(prev.items) ? prev.items : []), { product_id: "", quantity: 1, unit_price: null, variant: '', variant_json: null }],
                  }));
                  setItemSearches((prev) => [...(Array.isArray(prev) ? prev : []), '']);
                  if (editingId) {
                    setSplitDeliverNow((prev) => [...(Array.isArray(prev) ? prev : []), true]);
                  }
                }}
                disabled={saving}
              >
                <i className="fas fa-plus me-2"></i>Thêm sản phẩm
              </button>
            </div>

            <div className="d-grid gap-2">
              {(Array.isArray(form.items) ? form.items : [{ product_id: "", quantity: 1 }]).map((it, idx) => (
                <div key={idx} className="row g-2 align-items-end">
                  <div className="col-12 col-md-8">
                    <div
                      className="dropdown w-100"
                      ref={(el) => {
                        productDropdownRefs.current[idx] = el;
                      }}
                    >
                      <button
                        type="button"
                        className="form-control text-start d-flex align-items-center justify-content-between"
                        style={{ borderRadius: 10, padding: 12 }}
                        onClick={() => {
                          setOpenProductDropdownIdx((prev) => (prev === idx ? null : idx));
                          setTimeout(() => {
                            const input = document.getElementById(`order-product-search-${idx}`);
                            if (input) input.focus();
                          }, 0);
                        }}
                      >
                        <span className={it.product_id ? '' : 'text-muted'} style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {getProductLabel(it.product_id)}
                        </span>
                        <i className="fas fa-chevron-down text-muted" style={{ marginLeft: 8, flexShrink: 0 }}></i>
                      </button>

                      {openProductDropdownIdx === idx && (
                        <div
                          className="dropdown-menu show w-100 p-2"
                          style={{ maxHeight: 320, overflowY: 'auto' }}
                        >
                          <input
                            id={`order-product-search-${idx}`}
                            className="form-control"
                            value={itemSearches[idx] || ''}
                            onChange={(e) => {
                              const next = e.target.value;
                              setItemSearches((prev) => {
                                const arr = Array.isArray(prev) ? [...prev] : [];
                                arr[idx] = next;
                                return arr;
                              });
                            }}
                            placeholder="Tìm theo tên / mã..."
                            style={{ borderRadius: 10, padding: 10 }}
                          />
                          <div className="mt-2" />
                          {(() => {
                            const filtered = getFilteredProducts(idx);
                            if (filtered.length === 0) {
                              return <div className="text-muted small px-2 py-1">Không có sản phẩm phù hợp</div>;
                            }
                            return filtered.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="dropdown-item"
                                onClick={() => {
                                  const next = String(p.id);
                                  const groups = normalizeVariantGroups(p?.variants);
                                  const selections = {};
                                  for (const g of groups) {
                                    const groupName = String(g?.name || '').trim();
                                    const first = Array.isArray(g?.options) ? g.options[0] : null;
                                    const firstLabel = String(first?.label || '').trim();
                                    if (groupName && firstLabel) selections[groupName] = firstLabel;
                                  }
                                  const variantText = buildVariantTextFromSelections(selections);
                                  const unitPrice = computeUnitPriceForProductAndSelections(p, selections);
                                  setForm((prev) => {
                                    const items = Array.isArray(prev.items) ? [...prev.items] : [];
                                    items[idx] = {
                                      ...(items[idx] || { quantity: 1 }),
                                      product_id: next,
                                      variant_json: Object.keys(selections).length ? selections : null,
                                      variant: variantText,
                                      unit_price: groups.length ? unitPrice : null,
                                    };
                                    return { ...prev, items };
                                  });
                                  setOpenProductDropdownIdx(null);
                                }}
                              >
                                {p.name}{p.code ? ` (${p.code})` : ''}
                              </button>
                            ));
                          })()}
                        </div>
                      )}

                      {/* Keep native required validation */}
                      <select
                        className="form-select"
                        value={it.product_id}
                        onChange={() => {}}
                        required
                        style={{ position: 'absolute', opacity: 0, height: 0, pointerEvents: 'none' }}
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        <option value="">-- chọn sản phẩm --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {(() => {
                      const issue = orderFieldIssues.items?.[idx];
                      if (!issue) return null;
                      return (
                        <>
                          {!!issue.productError && <div className="form-text text-danger">{issue.productError}</div>}
                          {!!issue.dupWarn && <div className="form-text text-warning">{issue.dupWarn}</div>}
                        </>
                      );
                    })()}

                    {(() => {
                      if (!it?.product_id) return null;
                      const p = getProductById(it.product_id);
                      const groups = normalizeVariantGroups(p?.variants);
                      if (!groups.length) return null;

                      const selections = (it?.variant_json && typeof it.variant_json === 'object') ? it.variant_json : {};

                      return (
                        <div className="mt-2 d-grid gap-2">
                          {groups.map((g, gi) => {
                            const groupName = String(g?.name || `Biến thể ${gi + 1}`).trim();
