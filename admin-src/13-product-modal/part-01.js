
    function ProductModal({ show, product, categories, onClose, onSave }) {
      const [formData, setFormData] = useState({ name: '', code: '', price: '', image: '', category: '', note: '', sort_order: 0, commission_percent: 5, variants: [], attributes: [] });
      const [saving, setSaving] = useState(false);
      const [uploading, setUploading] = useState(false);

      const getBasePriceInt = (priceText) => {
        const digits = window.KTM.money.getDigits(String(priceText ?? ''));
        const n = Number(digits);
        return digits && Number.isFinite(n) ? Math.trunc(n) : 0;
      };

      const normalizeAttributes = (v) => {
        if (v == null || v === '') return [];
        let next = v;
        if (typeof next === 'string') {
          const s = next.trim();
          if (!s) return [];
          try {
            next = JSON.parse(s);
          } catch {
            return [];
          }
        }

        if (next && typeof next === 'object' && !Array.isArray(next)) {
          next = Object.entries(next).map(([k, val]) => ({ key: k, value: val }));
        }
        if (!Array.isArray(next)) return [];

        return next
          .map((a) => {
            if (!a || typeof a !== 'object') return null;
            const key = String(a.key ?? a.name ?? a.label ?? '').trim();
            const valueStr = String(a.value ?? '').trim();
            const unit = String(a.unit ?? '').trim();
            if (!key) return null;
            return { key, value: valueStr, unit };
          })
          .filter(Boolean);
      };

      const normalizeVariants = (v, basePriceText) => {
        if (v == null || v === '') return [];
        let next = v;
        if (typeof next === 'string') {
          const s = next.trim();
          if (!s) return [];
          try {
            next = JSON.parse(s);
          } catch {
            return [];
          }
        }
        if (!Array.isArray(next)) return [];
        const base = getBasePriceInt(basePriceText);
        return next
          .map((g) => {
            if (!g || typeof g !== 'object') return null;
            const name = String(g.name ?? '').trim();
            const options = (Array.isArray(g.options) ? g.options : [])
              .map((o) => {
                if (!o || typeof o !== 'object') return null;
                const label = String(o.label ?? '').trim();
                if (!label) return null;
                const pRaw = o.price ?? o.priceValue ?? o.unit_price ?? o.unitPrice ?? null;
                const pNum = Number(pRaw);
                let price = Number.isFinite(pNum) ? Math.trunc(pNum) : null;

                if (price == null) {
                  const dRaw = o.price_delta ?? o.priceDelta ?? null;
                  const dNum = Number(dRaw);
                  if (Number.isFinite(dNum)) price = base + Math.trunc(dNum);
                }

                if (price == null) price = base;
                const digits = String(Math.max(0, Math.trunc(Number(price) || 0)));
                return { label, price: Math.max(0, Math.trunc(Number(price) || 0)), priceDigits: digits };
              })
              .filter(Boolean);
            return { name: name || 'Biến thể', options };
          })
          .filter(Boolean);
      };

      useEffect(() => {
        if (product) {
          setFormData({
            name: product.name || '',
            code: product.code || '',
            price: product.price || '',
            image: product.image || '',
            category: product.category || '',
            note: product.note || '',
            sort_order: product.sort_order || 0,
            commission_percent: (product.commission_percent ?? product.commissionPercent ?? 5),
            variants: normalizeVariants(product.variants, product.price),
            attributes: normalizeAttributes(product.attributes)
          });
        } else {
          setFormData({ name: '', code: '', price: '', image: '', category: '', note: '', sort_order: 0, commission_percent: 5, variants: [], attributes: [] });
        }
      }, [product, show]);

      const applyVariantBulkBasePriceToGroup = (groupIndex) => {
        setFormData((prev) => {
          const bulk = getBasePriceInt(prev.price);
          const bulkDigits = String(bulk);
          const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
          const g = { ...(variants[groupIndex] || {}), options: Array.isArray(variants[groupIndex]?.options) ? [...variants[groupIndex].options] : [] };
          g.options = g.options.map((o) => ({ label: String(o?.label || ''), price: bulk, priceDigits: bulkDigits }));
          variants[groupIndex] = g;
          return { ...prev, variants };
        });
      };

      const applyVariantBulkBasePriceAll = () => {
        setFormData((prev) => {
          const bulk = getBasePriceInt(prev.price);
          const bulkDigits = String(bulk);
          const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
          const next = variants.map((g) => {
            const options = (Array.isArray(g?.options) ? g.options : []).map((o) => ({
              label: String(o?.label || ''),
              price: bulk,
              priceDigits: bulkDigits,
            }));
            return { name: String(g?.name || 'Biến thể'), options };
          });
          return { ...prev, variants: next };
        });
      };

      // State để hiển thị tiến trình
      const [uploadStatus, setUploadStatus] = React.useState('');
      
      // Hàm format tiền VNĐ
      const formatVND = (digits) => window.KTM.money.formatVNDInputDigits(digits);
      
      // Lưu giá trị số thuần để so sánh
      const [priceNumbers, setPriceNumbers] = React.useState('');
      
      // Xử lý khi nhập giá
      const handlePriceChange = (e) => {
        const next = window.KTM.money.nextPriceInputState(e.target.value, priceNumbers);
        setPriceNumbers(next.digits);
        setFormData({ ...formData, price: next.price });
      };
      
      // Lưu ảnh cũ để xóa khi thay ảnh mới
      const [oldImage, setOldImage] = React.useState('');
      
      React.useEffect(() => {
        if (product?.image) {
          setOldImage(product.image);
        }
      }, [product]);

      // Hàm xóa ảnh trên Cloudinary
      const deleteCloudinaryImage = async (imageUrl) => {
        if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
        try {
          await window.KTM.api.postJSON(
            `${API_BASE}/api/products?action=delete-image`,
            { url: imageUrl },
            'Lỗi xóa ảnh'
          );
        } catch (err) {
          console.error('Delete cloudinary image error:', err);
        }
      };

      // Nén ảnh trước khi upload (cho file lớn từ iPhone)
      const compressImage = async (file, maxSizeMB = 2, onProgress) => {
        const maxSize = maxSizeMB * 1024 * 1024;
        
        // Nếu file đã nhỏ và không phải HEIC, không cần nén
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name);
        if (file.size <= maxSize && !isHeic) {
          return file;
        }
        
        onProgress?.('Đang xử lý ảnh...');
        
        try {
          // Dùng createImageBitmap - hỗ trợ HEIC trên Safari iOS
          const bitmap = await createImageBitmap(file);
          
          onProgress?.('Đang nén ảnh...');
          
          const canvas = document.createElement('canvas');
          
          // Resize (max 1200px)
          let width = bitmap.width;
          let height = bitmap.height;
          const maxDimension = 1200;
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height / width) * maxDimension);
              width = maxDimension;
            } else {
              width = Math.round((width / height) * maxDimension);
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close(); // Giải phóng memory
          
          // Convert to blob
          return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) {
                onProgress?.('Hoàn tất!');
                resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
              } else {
                reject(new Error('Không nén được ảnh'));
              }
            }, 'image/jpeg', 0.7);
          });
        } catch (err) {
          console.error('createImageBitmap error:', err);
          throw new Error('Không thể xử lý ảnh. Thử chọn ảnh khác.');
        }
      };

      const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Validate file type for Safari iOS - check cả name nếu type rỗng
        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);
        if (!isImage) {
          alert('Vui lòng chọn file ảnh!');
          return;
        }
        
        setUploading(true);
        setUploadStatus('Đang chuẩn bị...');
        
        try {
          const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
          setUploadStatus(`File ${fileSizeMB}MB - Đang nén...`);
          
          // Nén ảnh nếu file quá lớn (>2MB)
          const compressedFile = await compressImage(file, 2, (status) => {
            setUploadStatus(status);
          });
          
          const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(1);
          setUploadStatus(`Đã nén: ${compressedSizeMB}MB - Đang upload...`);

          const data = await window.KTM.cloudinary.uploadImage({
            file: compressedFile,
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
          });
          
          if (data.secure_url) {
            // Xóa ảnh cũ trên Cloudinary khi upload ảnh mới thành công
            if (formData.image && formData.image !== oldImage) {
              deleteCloudinaryImage(formData.image);
            }
            setFormData(prev => ({ ...prev, image: data.secure_url }));
            setUploadStatus('');
          } else {
            console.error('Cloudinary error:', data);
            alert('Upload thất bại: ' + (data.error?.message || 'Lỗi không xác định'));
            setUploadStatus('');
          }
        } catch (err) {
          console.error('Upload error:', err);
          alert('Lỗi: ' + err.message);
          setUploadStatus('');
        }
        setUploading(false);
        e.target.value = '';
      };
      
      // Xóa ảnh hiện tại
      const handleRemoveImage = () => {
        if (formData.image) {
          // Chỉ xóa ngay nếu đây là ảnh mới upload (không phải ảnh gốc của sản phẩm)
          if (formData.image !== oldImage) {
            deleteCloudinaryImage(formData.image);
          }
          setFormData(prev => ({ ...prev, image: '' }));
        }
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        // Xóa ảnh cũ nếu đã thay bằng ảnh mới
        if (oldImage && formData.image && oldImage !== formData.image) {
          await deleteCloudinaryImage(oldImage);
        }
        // Xóa ảnh cũ nếu đã xóa ảnh
        if (oldImage && !formData.image) {
          await deleteCloudinaryImage(oldImage);
        }
        
        await onSave(formData);
        setSaving(false);
      };

      if (!show) return null;

      return (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down">
            <div className="modal-content" style={{borderRadius: '16px', overflow: 'hidden'}}>
              {/* Header gradient */}
              <div className="modal-header border-0 py-3" style={{background: 'linear-gradient(135deg, #ffc107 0%, #ffca2c 100%)'}}>
                <h6 className="modal-title fw-bold" style={{color: '#1a1a2e'}}>
                  <i className={`fas ${product ? 'fa-edit' : 'fa-plus-circle'} me-2`}></i>
                  {product ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
                </h6>
                <button type="button" className="btn-close" onClick={onClose}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body py-4" style={{maxHeight: '65vh', overflowY: 'auto', background: '#f8f9fa'}}>
                  {/* Image Upload */}
                  <div className="text-center mb-4">
                    <div className="position-relative d-inline-block">
                      {formData.image ? (
                        <>
                          <img src={formData.image} alt="" style={{width: 110, height: 110, objectFit: 'cover', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)'}} />
                          <button 
                            type="button" 
                            className="btn btn-danger position-absolute" 
                            onClick={handleRemoveImage} 
                            style={{top: -10, right: -10, width: 28, height: 28, padding: 0, borderRadius: '50%', boxShadow: '0 2px 8px rgba(220,53,69,0.4)'}}
                          >
                            <i className="fas fa-times" style={{fontSize: '0.75rem'}}></i>
                          </button>
                        </>
                      ) : (
                        <div className="d-flex align-items-center justify-content-center" style={{width: 110, height: 110, borderRadius: '12px', background: 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)', border: '2px dashed #adb5bd'}}>
                          <i className="fas fa-image fa-2x text-muted"></i>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <label className="btn btn-warning btn-sm px-3" style={{borderRadius: '20px'}}>
                        <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-camera'} me-1`}></i>
                        {uploading ? (uploadStatus || 'Đang xử lý...') : 'Chọn ảnh'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                          disabled={uploading}
                          style={{position: 'absolute', left: '-9999px', opacity: 0, width: 1, height: 1}}
                        />
                      </label>
                      {uploading && uploadStatus && (
                        <div className="text-center mt-1" style={{fontSize: 11, color: '#6c757d'}}>
                          {uploadStatus}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-dark mb-1">
                      <i className="fas fa-tag me-1 text-warning"></i>Tên sản phẩm *
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      required 
                      placeholder="VD: Combo Van 3 tay + 2 xylanh"
                      style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small text-dark mb-1">
                        <i className="fas fa-barcode me-1 text-info"></i>Mã SP
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.code} 
                        onChange={(e) => setFormData({...formData, code: e.target.value})} 
                        placeholder="KTM-01"
                        style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small text-dark mb-1">
                        <i className="fas fa-dollar-sign me-1 text-success"></i>Giá
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.price} 
                        onChange={handlePriceChange} 
                        placeholder="1.950.000đ"
                        inputMode="numeric"
                        style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-dark mb-1">
                      <i className="fas fa-percent me-1 text-secondary"></i>Hoa hồng (%)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.commission_percent}
                      min={0}
                      max={100}
                      step={0.01}
                      placeholder="5"
                      onChange={(e) => setFormData({...formData, commission_percent: e.target.value})}
                      style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-dark mb-1">
                      <i className="fas fa-folder me-1 text-primary"></i>Danh mục
                    </label>
                    <select 
                      className="form-select" 
                      value={formData.category} 
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-dark mb-1">
                      <i className="fas fa-sticky-note me-1 text-secondary"></i>Ghi chú
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.note} 
                      onChange={(e) => setFormData({...formData, note: e.target.value})} 
                      placeholder="VD: Thêm dây là 2.150.000đ"
                      style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-dark mb-1">
                      <i className="fas fa-sliders-h me-1 text-secondary"></i>Thuộc tính (cân nặng, chiều dài, ...)
                    </label>
                    <div className="border rounded-3 p-2" style={{ background: '#fff' }}>
                      {(Array.isArray(formData.attributes) ? formData.attributes : []).length === 0 ? (
                        <div className="text-muted small">Chưa có thuộc tính. Ví dụ: Cân nặng, Chiều dài, Vật liệu...</div>
                      ) : null}

                      {(Array.isArray(formData.attributes) ? formData.attributes : []).map((attr, ai) => (
                        <div key={ai} className="row g-2 align-items-center mb-2">
                          <div className="col-5">
                            <input
                              type="text"
                              className="form-control"
                              value={attr?.key || ''}
                              onChange={(e) => {
                                const nextKey = e.target.value;
                                setFormData((prev) => {