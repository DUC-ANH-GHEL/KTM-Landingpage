                                  const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                  attributes[ai] = { ...(attributes[ai] || {}), key: nextKey };
                                  return { ...prev, attributes };
                                });
                              }}
                              placeholder="Tên (vd: Cân nặng)"
                              style={{ borderRadius: 10 }}
                            />
                          </div>
                          <div className="col-4">
                            <input
                              type="text"
                              className="form-control"
                              value={attr?.value || ''}
                              onChange={(e) => {
                                const nextVal = e.target.value;
                                setFormData((prev) => {
                                  const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                  attributes[ai] = { ...(attributes[ai] || {}), value: nextVal };
                                  return { ...prev, attributes };
                                });
                              }}
                              placeholder="Giá trị (vd: 10)"
                              style={{ borderRadius: 10 }}
                            />
                          </div>
                          <div className="col-2">
                            <input
                              type="text"
                              className="form-control"
                              value={attr?.unit || ''}
                              onChange={(e) => {
                                const nextUnit = e.target.value;
                                setFormData((prev) => {
                                  const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                  attributes[ai] = { ...(attributes[ai] || {}), unit: nextUnit };
                                  return { ...prev, attributes };
                                });
                              }}
                              placeholder="Đơn vị"
                              style={{ borderRadius: 10 }}
                            />
                          </div>
                          <div className="col-1 d-flex justify-content-end">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => {
                                setFormData((prev) => {
                                  const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                  attributes.splice(ai, 1);
                                  return { ...prev, attributes };
                                });
                              }}
                              title="Xóa thuộc tính"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm mt-1"
                        onClick={() => {
                          setFormData((prev) => {
                            const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                            attributes.push({ key: '', value: '', unit: '' });
                            return { ...prev, attributes };
                          });
                        }}
                        style={{ borderRadius: 10 }}
                      >
                        <i className="fas fa-plus me-1"></i>Thêm thuộc tính
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-dark mb-1">
                      <i className="fas fa-layer-group me-1 text-secondary"></i>Biến thể (size, ...)
                    </label>
                    <div className="border rounded-3 p-2" style={{ background: '#fff' }}>
                      {(Array.isArray(formData.variants) ? formData.variants : []).length === 0 ? (
                        <div className="text-muted small">Chưa có biến thể.</div>
                      ) : null}

                      {(Array.isArray(formData.variants) ? formData.variants : []).map((group, gi) => (
                        <div key={gi} className="mb-3">
                          <div className="d-flex gap-2 align-items-center mb-2">
                            <input
                              type="text"
                              className="form-control"
                              value={group?.name || ''}
                              onChange={(e) => {
                                const nextName = e.target.value;
                                setFormData((prev) => {
                                  const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                  variants[gi] = { ...(variants[gi] || {}), name: nextName, options: Array.isArray(variants[gi]?.options) ? variants[gi].options : [] };
                                  return { ...prev, variants };
                                });
                              }}
                              placeholder="Tên nhóm (ví dụ: Size)"
                              style={{ borderRadius: 10 }}
                            />

                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                                onClick={() => applyVariantBulkBasePriceToGroup(gi)}
                                title="Đặt giá giống giá gốc sản phẩm cho tất cả lựa chọn trong nhóm"
                                disabled={!Array.isArray(group?.options) || group.options.length === 0}
                            >
                              Đồng giá
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => {
                                setFormData((prev) => {
                                  const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                  variants.splice(gi, 1);
                                  return { ...prev, variants };
                                });
                              }}
                              title="Xóa nhóm"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>

                          <div className="d-grid gap-2">
                            {(Array.isArray(group?.options) ? group.options : []).map((opt, oi) => (
                              <div key={oi} className="row g-2 align-items-center">
                                <div className="col-7">
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={opt?.label || ''}
                                    onChange={(e) => {
                                      const nextLabel = e.target.value;
                                      setFormData((prev) => {
                                        const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                        const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                        const currentPrice = Number(g.options[oi]?.price ?? 0) || 0;
                                        const currentDigits = String(g.options[oi]?.priceDigits ?? Math.max(0, Math.trunc(currentPrice)));
                                        g.options[oi] = { ...(g.options[oi] || {}), label: nextLabel, price: Math.max(0, Math.trunc(currentPrice)), priceDigits: currentDigits };
                                        variants[gi] = g;
                                        return { ...prev, variants };
                                      });
                                    }}
                                    placeholder="Giá trị (ví dụ: M)"
                                    style={{ borderRadius: 10 }}
                                  />
                                </div>
                                <div className="col-4">
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={formatVND(String(opt?.priceDigits ?? window.KTM.money.getDigits(String(opt?.price ?? ''))))}
                                    onChange={(e) => {
                                      setFormData((prev) => {
                                        const prevDigits = String(opt?.priceDigits ?? window.KTM.money.getDigits(String(opt?.price ?? '')));
                                        const next = window.KTM.money.nextPriceInputState(e.target.value, prevDigits);
                                        const digits = String(next.digits ?? '');
                                        const n = Number(digits);
                                        const nextPrice = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
                                        const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                        const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                        g.options[oi] = { ...(g.options[oi] || {}), label: String(g.options[oi]?.label || ''), price: nextPrice, priceDigits: digits };
                                        variants[gi] = g;
                                        return { ...prev, variants };
                                      });
                                    }}
                                    placeholder="Giá (đ)"
                                    style={{ borderRadius: 10 }}
                                  />
                                </div>
                                <div className="col-1 d-flex justify-content-end">
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => {
                                      setFormData((prev) => {
                                        const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                        const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                        g.options.splice(oi, 1);
                                        variants[gi] = g;
                                        return { ...prev, variants };
                                      });
                                    }}
                                    title="Xóa lựa chọn"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm mt-2"
                            onClick={() => {
                              setFormData((prev) => {
                                const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                const base = getBasePriceInt(prev.price);
                                g.options.push({ label: '', price: base, priceDigits: String(base) });
                                variants[gi] = g;
                                return { ...prev, variants };
                              });
                            }}
                            style={{ borderRadius: 10 }}
                          >
                            <i className="fas fa-plus me-1"></i>Thêm lựa chọn
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="btn btn-outline-warning btn-sm"
                        onClick={() => {
                          setFormData((prev) => {
                            const base = getBasePriceInt(prev.price);
                            const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                            const d = String(base);
                            variants.push({ name: 'Size', options: [{ label: 'S', price: base, priceDigits: d }, { label: 'M', price: base, priceDigits: d }, { label: 'L', price: base, priceDigits: d }] });
                            return { ...prev, variants };
                          });
                        }}
                        style={{ borderRadius: 10 }}
                      >
                        <i className="fas fa-plus me-1"></i>Thêm nhóm biến thể
                      </button>

                      <div className="d-flex gap-2 align-items-center mt-2">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={applyVariantBulkBasePriceAll}
                          disabled={!Array.isArray(formData.variants) || formData.variants.length === 0}
                          style={{ borderRadius: 10 }}
                          title="Đặt giá giống giá gốc sản phẩm cho tất cả lựa chọn ở mọi nhóm"
                        >
                          Đồng giá (tất cả)
                        </button>
                      </div>

                      <div className="text-muted small mt-2">Giá biến thể là giá cụ thể (đ). Ví dụ Size S: 15.000đ, Size M: 25.000đ.</div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label fw-semibold small text-muted mb-1">
                      <i className="fas fa-link me-1"></i>URL ảnh (tùy chọn)
                    </label>
                    <input 
                      type="url" 
                      className="form-control" 
                      placeholder="https://..." 
                      value={formData.image} 
                      onChange={(e) => setFormData({...formData, image: e.target.value})}
                      style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '10px', fontSize: '0.9rem'}}
                    />
                  </div>
                </div>

                <div className="modal-footer border-0 py-3" style={{background: '#fff'}}>
                  <button type="button" className="btn btn-light px-4" onClick={onClose} style={{borderRadius: '10px'}}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-warning px-4 fw-semibold" disabled={saving} style={{borderRadius: '10px', boxShadow: '0 4px 12px rgba(255,193,7,0.3)'}}>
                    {saving ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</>
                    ) : (
                      <><i className="fas fa-check me-2"></i>Lưu sản phẩm</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // Video Modal (Create/Edit)
