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
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-layer-group me-1"></i>Biến thể (size, ...)
                          </label>
                          <div className="border rounded-3 p-2" style={{ background: '#fff' }}>
                            {(Array.isArray(formData.variants) ? formData.variants : []).length === 0 ? (
                              <div className="text-muted small">Chưa có biến thể. Có thể thêm (ví dụ Size: S/M/L).</div>
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
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold small text-muted mb-1">
                          <i className="fas fa-image me-1"></i>Ảnh sản phẩm
                        </label>
                        <div className="mb-2">
                          {formData.image ? (
                            <>
                              <img 
                                src={formData.image} 
                                alt="Product" 
                                style={{width: '100%', height: 150, objectFit: 'cover', borderRadius: '12px', border: '2px solid #e9ecef'}}
                              />
                              <button 
                                type="button"
                                className="btn btn-sm btn-danger mt-2"
                                onClick={() => setFormData({...formData, image: ''})}
                                style={{borderRadius: '20px', fontSize: '0.75rem'}}
                              >
                                <i className="fas fa-times me-1"></i>Xóa ảnh
                              </button>
                            </>
                          ) : (
                            <div 
                              className="d-flex align-items-center justify-content-center" 
                              style={{width: '100%', height: 150, borderRadius: '12px', background: 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)', border: '2px dashed #adb5bd', cursor: 'pointer'}}
                              onClick={() => imageInputRef.current?.click()}
                            >
                              <div className="text-center">
                                <i className="fas fa-cloud-upload-alt fa-2x text-muted mb-2"></i>
                                <div className="small text-muted">Click để upload</div>
                              </div>
                            </div>
                          )}
                        </div>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          className="d-none"
                          onChange={handleImageUpload}
                        />
                        <button 
                          type="button"
                          className="btn btn-outline-secondary w-100"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={uploading}
                          style={{borderRadius: '10px'}}
                        >
                          {uploading ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span>Đang upload...</>
                          ) : (
                            <><i className="fas fa-upload me-2"></i>Upload ảnh</>
                          )}
                        </button>
                        <div className="mt-2">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-link me-1"></i>Hoặc URL ảnh
                          </label>
                          <input 
                            type="url" 
                            className="form-control" 
                            value={formData.image} 
                            onChange={(e) => setFormData({...formData, image: e.target.value})} 
                            placeholder="https://..."
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '8px', fontSize: '0.875rem'}}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer" style={{border: 'none', padding: '20px'}}>
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

      // ========== MOBILE CARD COMPONENT ==========
      const formatVNDNumber = (n) => window.KTM.money.formatVND(n);

      const parseVariantGroupsForDisplay = (value) => {
        if (value == null || value === '') return [];
        let v = value;
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s) return [];
          try {
            v = JSON.parse(s);
          } catch {
            return [];
          }
        }
        return Array.isArray(v) ? v : [];
      };

      const parseAttributesForDisplay = (value) => {
        if (value == null || value === '') return [];
        let v = value;
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s) return [];
          try {
            v = JSON.parse(s);
          } catch {
            return [];
          }
        }
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          v = Object.entries(v).map(([k, val]) => ({ key: k, value: val }));
        }
        return Array.isArray(v) ? v : [];
      };

      const renderAttributesPreview = (attributes, opts = {}) => {
        const rows = parseAttributesForDisplay(attributes)
          .map((a) => ({
            key: String(a?.key ?? a?.name ?? a?.label ?? '').trim(),
            value: String(a?.value ?? '').trim(),
            unit: String(a?.unit ?? '').trim(),
          }))
          .filter((a) => !!a.key);

        if (!rows.length) return null;

        const compact = !!opts.compact;
        const extraClassName = String(opts.className ?? '').trim();

        return (
          <div className={`ktm-variants-preview${compact ? ' compact' : ''}${extraClassName ? ' ' + extraClassName : ''}`}>
            <i className="fas fa-sliders-h"></i>
            <div className="ktm-variants-chips">
              {rows.map((a, idx) => {
                const keyText = a.key;
                const valueText = `${a.value || ''}${a.unit ? (a.value ? ' ' : '') + a.unit : ''}`.trim();
                return (
                  <div key={`${keyText}-${idx}`} className="ktm-variants-group">
                    <span className="ktm-chip ktm-chip-group">{keyText}</span>
                    {valueText ? <span className="ktm-chip ktm-chip-option">{valueText}</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      };

      const renderVariantsPreview = (variants, opts = {}) => {
        const groups = parseVariantGroupsForDisplay(variants)
          .map(g => ({
            name: String(g?.name ?? '').trim(),
            options: Array.isArray(g?.options) ? g.options : [],
          }))
          .map(g => ({
            ...g,
            options: g.options
              .map(o => ({
                label: String(o?.label ?? '').trim(),
                price: Number(o?.price),
              }))
              .filter(o => !!o.label),
          }))
          .filter(g => g.options.length > 0);

        if (!groups.length) return null;

        const maxGroups = Number.isFinite(opts.maxGroups)
          ? Math.max(1, Math.trunc(opts.maxGroups))
          : groups.length;
        const maxOptionsPerGroup = Number.isFinite(opts.maxOptionsPerGroup)
          ? Math.max(1, Math.trunc(opts.maxOptionsPerGroup))
          : 3;
        const compact = !!opts.compact;
        const extraClassName = String(opts.className ?? '').trim();

        const shownGroups = groups.slice(0, maxGroups);

        return (
          <div className={`ktm-variants-preview${compact ? ' compact' : ''}${extraClassName ? ' ' + extraClassName : ''}`}>
            <i className="fas fa-layer-group"></i>
            <div className="ktm-variants-chips">
              {shownGroups.map((g, gi) => {
                const groupName = g.name || 'Biến thể';
                const shownOptions = g.options.slice(0, maxOptionsPerGroup);
                const hiddenOptionsCount = g.options.length - shownOptions.length;

                return (
                  <div key={`${groupName}-${gi}`} className="ktm-variants-group">
                    <span className="ktm-chip ktm-chip-group">{groupName}</span>
                    {shownOptions.map((o, oi) => {
                      const p = o.price;
                      const priceText = Number.isFinite(p) && p >= 0 ? formatVNDNumber(Math.trunc(p)) : '';
                      const text = priceText ? `${o.label} · ${priceText}` : o.label;
                      return (
                        <span key={`${groupName}-${gi}-${oi}`} className="ktm-chip ktm-chip-option">{text}</span>
                      );
                    })}
                    {hiddenOptionsCount > 0 && (
                      <span className="ktm-chip ktm-chip-more">+{hiddenOptionsCount}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      };

      const renderMobileCard = (item, index) => {
        const isProduct = item._type === 'product';
        const isAlbum = item._type === 'album';
        const isVideo = item._type === 'video';
        const hasPromo = item.note && (item.note.toLowerCase().includes('free') || item.note.toLowerCase().includes('giảm') || item.note.toLowerCase().includes('sale'));
        const attributesPreview = isProduct
          ? renderAttributesPreview(item.attributes, {
              compact: viewMode === 'grid',
              className: viewMode === 'grid' ? 'meta text-muted' : 'text-muted',
            })
          : null;
        const variantsPreview = isProduct
          ? renderVariantsPreview(item.variants, {
              compact: viewMode === 'grid',
              // Tra cứu: hiển thị hết option, không hiện dạng +N
              maxOptionsPerGroup: 999,
              className: viewMode === 'grid' ? 'meta text-muted' : 'text-muted',
            })
          : null;

        if (viewMode === 'grid') {
          // Grid view - compact cards
          return (
            <div key={item.id || index} className="grid-card">
              <div className="thumb-wrap" onClick={() => { trackProductUsage(item, 'preview'); setPreviewImage({ url: item.image, name: item.name, price: item.price, note: item.note, item }); }}>
                {item.image ? (
                  <img src={item.image} alt={item.name} className="thumb" loading="lazy" />
                ) : (
                  <div className="thumb d-flex align-items-center justify-content-center bg-light">
                    <i className={`fas ${isVideo ? 'fa-video' : 'fa-image'} fa-2x text-muted`}></i>
                  </div>
                )}
                {/* Price overlay */}
                {item.price && (
                  <div className="price-overlay">{item.price.replace(/[đ\s]/g, '')}đ</div>
                )}
                {/* Type badge */}
                <span className={`type-badge ${isProduct ? 'product' : isAlbum ? 'album' : 'video'}`}>
                  {isProduct ? 'SP' : isAlbum ? 'Ảnh' : 'Video'}
                </span>
                {/* Promo badge */}
                {hasPromo && <span className="promo-badge">🔥 ƯU ĐÃI</span>}
              </div>
              <div className="card-body">
                <div className="name">{item.name}</div>
                {item.note && <div className="meta text-info" style={{fontSize: 10}}>{item.note}</div>}
                {attributesPreview && <div style={{ marginTop: 2 }}>{attributesPreview}</div>}
                {variantsPreview && <div style={{ marginTop: 2 }}>{variantsPreview}</div>}
                <div className="quick-copy">
                  <button 
                    className={copiedId === item.id + '-img' ? 'copied' : ''}
                    onClick={() => copyImage(item.image, item.id, { item, action: 'copy_image' })}
                  >
                    <i className="fas fa-image"></i>
                  </button>
                  {item.price && (
                    <button 
                      className={copiedId === item.id + '-price' ? 'copied' : ''}
                      onClick={() => copyText(item.price.replace(/[đ\s]/g, ''), item.id + '-price', { item, action: 'copy_price' })}