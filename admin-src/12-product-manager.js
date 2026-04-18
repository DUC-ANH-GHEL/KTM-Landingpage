    // ==================== PRODUCT MANAGER ====================
    function ProductManager({ showToast, settings }) {
      const [products, setProducts] = useState([]);
      const [loading, setLoading] = useState(true);
      const [showModal, setShowModal] = useState(false);
      const [editingProduct, setEditingProduct] = useState(null);
      const [searchTerm, setSearchTerm] = useState('');
      const [filterCategory, setFilterCategory] = useState('');

      // Ops inspector drawer
      const [inspectorOpen, setInspectorOpen] = useState(false);
      const [inspectorProduct, setInspectorProduct] = useState(null);

      const shipPercent = normalizeShipPercent(settings?.ship_percent);

      const { parseMoney, formatVND } = window.KTM.money;

      const categories = ['Ty xy lanh', 'Combo Van 1 tay', 'Combo Van 2 tay', 'Combo Van 3 tay', 'Combo Van 4 tay', 'Combo Van 5 tay', 'Trang gạt', 'Phụ kiện', 'Van điều khiển', 'Sàn đa năng KTM - Móc lật'];

      useEffect(() => { loadProducts(); }, []);

      const loadProducts = async () => {
        setLoading(true);
        try {
          const data = await window.KTM.api.getJSON(`${API_BASE}/api/products`, 'Lỗi tải sản phẩm');
          setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error(err);
          showToast('Lỗi tải sản phẩm', 'danger');
        }
        setLoading(false);
      };

      const handleCreate = () => { setEditingProduct(null); setShowModal(true); };

      const handleEdit = (product) => { setEditingProduct(product); setShowModal(true); };

      const openProductInspector = (product) => {
        if (!product) return;
        setInspectorProduct(product);
        setInspectorOpen(true);
      };

      const closeProductInspector = () => {
        setInspectorOpen(false);
      };
      
      // Hàm xóa ảnh trên Cloudinary (dùng chung)
      const deleteCloudinaryImageGlobal = async (imageUrl) => {
        if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;

        try {
          await window.KTM.api.postJSON(
            `${API_BASE}/api/products?action=delete-image`,
            { url: imageUrl },
            'Lỗi xóa ảnh'
          );
          // Xóa cache khi xóa
          window.KTM.cache.remove(CACHE_KEY);
          showToast(`Đã xóa ${typeName}`, 'success');
          loadAllData();
          loadProducts();
        } catch (err) {
          showToast('Lỗi xóa sản phẩm', 'danger');
        }
      };

      const handleSave = async (formData) => {
        try {
          const url = editingProduct 
            ? `${API_BASE}/api/products?id=${editingProduct.id}`
            : `${API_BASE}/api/products`;
          if (editingProduct) {
            await window.KTM.api.putJSON(url, formData, 'Lỗi lưu sản phẩm');
          } else {
            await window.KTM.api.postJSON(url, formData, 'Lỗi lưu sản phẩm');
          }
          showToast(editingProduct ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!', 'success');
          setShowModal(false);
          loadProducts();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };

      const handleDelete = async (product) => {
        if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}"?`)) return;
        
        try {
          await window.KTM.api.deleteJSON(
            `${API_BASE}/api/products?id=${product.id}`,
            'Lỗi xóa sản phẩm'
          );
          
          showToast('Xóa sản phẩm thành công!', 'success');
          loadProducts();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };

      const filteredProducts = products.filter(p => {
        const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchCategory = !filterCategory || p.category === filterCategory;
        return matchSearch && matchCategory;
      });

      const getCommissionPercentNumber = (product) => {
        const raw = product?.commission_percent ?? product?.commissionPercent;
        const parsed = raw === '' || raw == null ? NaN : Number(raw);
        return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 5;
      };

      const formatCommissionWithAmount = (product) => {
        const pct = getCommissionPercentNumber(product);
        const prettyPct = Number.isInteger(pct) ? String(pct) : String(Math.round(pct * 100) / 100);

        const price = parseMoney(product?.price);
        if (!Number.isFinite(price) || price <= 0) return `${prettyPct}%`;

        const rate = (Number(pct) || 0) / 100;
        const explicitShipFee = window.KTM.money.parseShipFeeFromNote(product?.note);
        // Nếu sản phẩm đã ghi rõ ship trong note => hoa hồng tính trên nguyên giá (không trừ ship).
        // Nếu không có ship trong note => trừ ship ước tính theo % cài đặt.
        const shipCost = explicitShipFee != null
          ? 0
          : (shipPercent > 0 ? (price * shipPercent / 100) : 0);
        const commission = (price * rate) - (shipCost * rate);
        const commissionRounded = Math.max(0, Math.round(commission));

        return `${prettyPct}% - ${formatVND(commissionRounded)}`;
      };

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

      const renderAttributesPreview = (attributes) => {
        const rows = parseAttributesForDisplay(attributes)
          .map((a) => ({
            key: String(a?.key ?? a?.name ?? a?.label ?? '').trim(),
            value: String(a?.value ?? '').trim(),
            unit: String(a?.unit ?? '').trim(),
          }))
          .filter((a) => !!a.key);

        if (!rows.length) return null;

        return (
          <div className="ktm-variants-preview">
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
          : 4;

        const shownGroups = groups.slice(0, maxGroups);

        return (
          <div className="ktm-variants-preview">
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
                      const priceText = Number.isFinite(p) && p >= 0 ? formatVND(Math.trunc(p)) : '';
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

      return (
        <div className="product-manager pb-5 mb-4">
          {/* Header */}
          <div className="product-header">
            <h5><i className="fas fa-box me-2"></i>Sản phẩm</h5>
            <button className="btn-add-product" onClick={handleCreate}>
              <i className="fas fa-plus me-1"></i>Thêm mới
            </button>
          </div>

          {/* Search & Filter */}
          <div className="product-search">
            <div className="d-flex gap-2 mb-2">
              <div className="flex-grow-1 position-relative">
                <input
                  type="text"
                  className="form-control"
                  placeholder="🔍 Tìm sản phẩm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <span className="product-count">{filteredProducts.length}</span>
            </div>
            <select className="form-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">📁 Tất cả danh mục</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Product List */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-warning" style={{width: '2.5rem', height: '2.5rem'}}></div>
              <p className="text-muted mt-3 mb-0">Đang tải...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-box-open"></i>
              <p>Chưa có sản phẩm nào</p>
              <button className="btn btn-warning" onClick={handleCreate}>
                <i className="fas fa-plus me-2"></i>Thêm sản phẩm đầu tiên
              </button>
            </div>
          ) : (
            <div className="product-list">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="product-item d-flex align-items-center gap-3"
                  role="button"
                  tabIndex={0}
                  onClick={() => openProductInspector(product)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openProductInspector(product);
                    }
                  }}
                  title="Xem chi tiết"
                >
                  {/* Image */}
                  {product.image ? (
                    <img src={product.image} alt="" className="product-img" />
                  ) : (
                    <div className="product-img-placeholder">
                      <i className="fas fa-image text-muted"></i>
                    </div>
                  )}
                  
                  {/* Info */}
                  <div className="flex-grow-1 min-width-0">
                    <div className="product-name">{product.name}</div>
                    <div className="d-flex flex-wrap gap-1 mb-1">
                      {product.category && (
                        <span className="product-badge bg-info bg-opacity-75">{product.category}</span>
                      )}
                      {product.code && (
                        <span className="product-badge bg-secondary">{product.code}</span>
                      )}
                      <span
                        className="product-badge bg-warning text-dark"
                        title="Hoa hồng (%)"
                      >
                        <i className="fas fa-percent me-1"></i>{formatCommissionWithAmount(product)}
                      </span>
                    </div>
                    <div className="product-price">{product.price ? product.price.replace(/[đ\s]/g, '') + 'đ' : 'Liên hệ'}</div>
                    {product.note && (
                      <div className="text-muted small mt-1" style={{fontSize: '0.75rem'}}>{product.note}</div>
                    )}
                    {renderAttributesPreview(product.attributes) && (
                      <div className="mt-1" style={{fontSize: '0.75rem'}}>
                        {renderAttributesPreview(product.attributes)}
                      </div>
                    )}
                    {renderVariantsPreview(product.variants, { maxOptionsPerGroup: 4 }) && (
                      <div className="mt-1" style={{fontSize: '0.75rem'}}>
                        {renderVariantsPreview(product.variants, { maxOptionsPerGroup: 4 })}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="product-actions">
                    <button className="btn btn-edit" onClick={(e) => { e.stopPropagation(); handleEdit(product); }} title="Sửa">
                      <i className="fas fa-pen"></i>
                    </button>
                    <button className="btn btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(product); }} title="Xóa">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <AdminDrawer
            open={inspectorOpen}
            title={String(inspectorProduct?.name || 'Sản phẩm')}
            subtitle={[String(inspectorProduct?.code || '').trim() || null, String(inspectorProduct?.category || '').trim() || null].filter(Boolean).join(' • ')}
            onClose={closeProductInspector}
            footer={(
              <div className="d-flex flex-wrap gap-2 justify-content-between">
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      const code = String(inspectorProduct?.code || '').trim();
                      if (!code) return;
                      window.KTM.clipboard.writeText(code).then(() => showToast('Đã copy mã sản phẩm', 'success'));
                    }}
                    disabled={!String(inspectorProduct?.code || '').trim()}
                    title="Copy mã"
                  >
                    <i className="fas fa-barcode me-2"></i>Copy mã
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      const price = String(inspectorProduct?.price || '').trim();
                      if (!price) return;
                      window.KTM.clipboard.writeText(price).then(() => showToast('Đã copy giá', 'success'));
                    }}
                    disabled={!String(inspectorProduct?.price || '').trim()}
                    title="Copy giá"
                  >
                    <i className="fas fa-copy me-2"></i>Copy giá
                  </button>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => inspectorProduct && handleEdit(inspectorProduct)}
                    disabled={!inspectorProduct}
                  >
                    <i className="fas fa-pen me-2"></i>Sửa
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => inspectorProduct && handleDelete(inspectorProduct)}
                    disabled={!inspectorProduct}
                  >
                    <i className="fas fa-trash me-2"></i>Xóa
                  </button>
                </div>
              </div>
            )}
          >
            {!inspectorProduct ? (
              <div className="text-muted">Chưa có dữ liệu</div>
            ) : (
              <>
                <div className="admin-drawer-section">
                  <h6><i className="fas fa-circle-info me-2 text-warning"></i>Tổng quan</h6>
                  <div className="admin-kv">
                    <div className="k">Giá</div>
                    <div className="v">{(() => {
                      const raw = String(inspectorProduct?.price || '').trim();
                      const n = parseMoney(raw);
                      if (Number.isFinite(n) && n > 0) return formatVND(Math.trunc(n));
                      return raw || 'Liên hệ';
                    })()}</div>
                    <div className="k">Hoa hồng</div>
                    <div className="v">{formatCommissionWithAmount(inspectorProduct)}</div>
                    <div className="k">Danh mục</div>
                    <div className="v">{inspectorProduct.category || '—'}</div>
                    <div className="k">Mã</div>
                    <div className="v"><span className="font-monospace">{inspectorProduct.code || '—'}</span></div>
                  </div>
                </div>

                <div className="admin-drawer-section">
                  <h6><i className="fas fa-image me-2 text-info"></i>Hình ảnh</h6>
                  {inspectorProduct.image ? (
                    <img
                      src={inspectorProduct.image}
                      alt=""
                      className="rounded"
                      style={{ width: '100%', maxHeight: 260, objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="text-muted">Chưa có ảnh</div>
                  )}
                </div>

                {(String(inspectorProduct.note || '').trim() || inspectorProduct.attributes || inspectorProduct.variants) && (
                  <div className="admin-drawer-section">
                    <h6><i className="fas fa-sliders-h me-2 text-primary"></i>Chi tiết</h6>
                    {(String(inspectorProduct.note || '').trim()) && (
                      <div className="text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        <span className="fw-semibold">Ghi chú:</span> {String(inspectorProduct.note || '').trim()}
                      </div>
                    )}
                    {renderAttributesPreview(inspectorProduct.attributes) ? (
                      <div className="mt-2">{renderAttributesPreview(inspectorProduct.attributes)}</div>
                    ) : null}
                    {renderVariantsPreview(inspectorProduct.variants, { maxGroups: 99, maxOptionsPerGroup: 8 }) ? (
                      <div className="mt-2">{renderVariantsPreview(inspectorProduct.variants, { maxGroups: 99, maxOptionsPerGroup: 8 })}</div>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </AdminDrawer>

          <ProductModal
            show={showModal}
            product={editingProduct}
            categories={categories}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        </div>
      );
    }

    // Product Modal (Create/Edit) - Light Theme
