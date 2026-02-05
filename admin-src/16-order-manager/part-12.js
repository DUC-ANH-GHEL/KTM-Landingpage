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
                    </div>
                    <div className="modal-footer" style={{ border: 'none' }}>
                      <button type="button" className="btn btn-light" onClick={closeModal} disabled={saving || splitting} style={{ borderRadius: 10 }}>
                        Hủy
                      </button>

                      {!!editingId && (
                        <button
                          type="button"
                          className="btn btn-outline-primary fw-semibold"
                          onClick={splitOrderDeliverNow}
                          disabled={saving || splitting}
                          style={{ borderRadius: 10 }}
                          title="Chọn sản phẩm giao đợt 1 và tách phần còn lại sang đơn chờ hàng"
                        >
                          {splitting ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span>Đang tách...</>
                          ) : (
                            <><i className="fas fa-random me-2"></i>Tách đơn giao ngay</>
                          )}
                        </button>
                      )}

                      {!editingId && (
                        <button
                          type="button"
                          className="btn btn-outline-warning fw-semibold"
                          onClick={() => saveOrder({ mode: 'new', origin: 'modal' })}
                          disabled={saving || !orderFieldIssues.canSubmit}
                          style={{ borderRadius: 10 }}
                          title="Lưu xong giữ form để tạo đơn mới"
                        >
                          <i className="fas fa-plus me-2"></i>Lưu &amp; tạo đơn mới
                        </button>
                      )}

                      <button type="submit" className="btn btn-warning fw-semibold" disabled={saving || splitting || !orderFieldIssues.canSubmit} style={{ borderRadius: 10, boxShadow: '0 4px 12px rgba(255,193,7,0.3)' }}>
                        {saving ? (
                          <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</>
                        ) : (
                          <><i className="fas fa-check me-2"></i>Lưu</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
