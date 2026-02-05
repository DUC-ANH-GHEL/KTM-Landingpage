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
