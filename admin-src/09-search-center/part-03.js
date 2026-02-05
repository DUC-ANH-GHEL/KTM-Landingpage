            {
              message: message,
              context: fullContext,
              audience: 'admin'
            },
            'API error'
          );
          
          const aiResponse = data.response || 'Xin lỗi, tôi không thể trả lời lúc này.';
          
          // Attach matching items with images/videos
          setAiMessages(prev => [...prev, { 
            role: 'assistant', 
            content: aiResponse,
            attachments: matchedItems
          }]);
        } catch (err) {
          console.error('AI Error:', err);
          
          // Fallback: Simple local search
          const lowerMsg = message.toLowerCase();
          const matches = allData.filter(item => {
            const text = Object.values(item).join(' ').toLowerCase();
            return lowerMsg.split(' ').some(word => text.includes(word));
          });

          let fallbackResponse = '';
          if (matches.length > 0) {
            fallbackResponse = `Tìm thấy ${matches.length} sản phẩm liên quan:\n\n`;
            matches.slice(0, 5).forEach(item => {
              fallbackResponse += `• ${item.name}`;
              if (item.price) fallbackResponse += ` - ${item.price.replace(/[đ\s]/g, '')}đ`;
              if (item.note) fallbackResponse += ` (${item.note})`;
              fallbackResponse += '\n';
            });
            if (matches.length > 5) fallbackResponse += `\n...và ${matches.length - 5} sản phẩm khác`;
          } else {
            fallbackResponse = 'Không tìm thấy sản phẩm phù hợp. Hãy thử từ khóa khác như "van", "combo", "xy lanh"...';
          }
          
          setAiMessages(prev => [...prev, { 
            role: 'assistant', 
            content: fallbackResponse,
            attachments: matches.slice(0, 4)
          }]);
        }

        setAiLoading(false);
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          aiInputRef.current?.focus();
        }, 100);
      };

      // Product Modal for FAB
      function ProductModal({ show, product, categories, onClose, onSave }) {
        const [formData, setFormData] = useState({ name: '', code: '', price: '', image: '', category: '', note: '', sort_order: 0, commission_percent: 5, variants: [], attributes: [] });
        const [saving, setSaving] = useState(false);
        const [uploading, setUploading] = useState(false);
        const imageInputRef = useRef(null);

        // Hàm format tiền VNĐ
        const formatVND = (digits) => window.KTM.money.formatVNDInputDigits(digits);

        const getBasePriceInt = (priceText) => {
          const digits = window.KTM.money.getDigits(String(priceText ?? ''));
          const n = Number(digits);
          return digits && Number.isFinite(n) ? Math.trunc(n) : 0;
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

                  // Backward compatibility: convert delta -> absolute when possible
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
            // Set price numbers từ product.price
            if (product.price) {
              const numbers = window.KTM.money.getDigits(product.price);
              setPriceNumbers(numbers);
              setFormData(prev => ({...prev, price: formatVND(numbers)}));
            } else {
              setPriceNumbers('');
            }
          } else {
            setFormData({ name: '', code: '', price: '', image: '', category: '', note: '', sort_order: 0, commission_percent: 5, variants: [], attributes: [] });
            setPriceNumbers('');
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
        
        // Lưu giá trị số thuần để so sánh
        const [priceNumbers, setPriceNumbers] = React.useState('');
        
        // Xử lý khi nhập giá
        const handlePriceChange = (e) => {
          const next = window.KTM.money.nextPriceInputState(e.target.value, priceNumbers);
          setPriceNumbers(next.digits);
          setFormData({ ...formData, price: next.price });
        };

        const compressImage = async (file, maxSizeMB = 2) => {
          const maxSize = maxSizeMB * 1024 * 1024;
          if (file.size <= maxSize) return file;

          try {
            const bitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            
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
            bitmap.close();
            
            return new Promise((resolve, reject) => {
              canvas.toBlob((blob) => {
                if (blob) {
                  resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                } else {
                  reject(new Error('Không nén được ảnh'));
                }
              }, 'image/jpeg', 0.8);
            });
          } catch (err) {
            console.error('Compress error:', err);
            throw new Error('Không thể xử lý ảnh. Thử chọn ảnh khác.');
          }
        };

        const handleImageUpload = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
          if (!isImage) {
            alert('Vui lòng chọn file ảnh!');
            return;
          }
          
          setUploading(true);
          try {
            const compressedFile = await compressImage(file);

            const data = await window.KTM.cloudinary.uploadImage({
              file: compressedFile,
              cloudName: CLOUDINARY_CLOUD_NAME,
              uploadPreset: CLOUDINARY_UPLOAD_PRESET,
              folder: 'ktm-products',
            });

            if (!data.secure_url) {
              console.error('Cloudinary error:', data);
              throw new Error(data.error?.message || 'Upload failed');
            }

            setFormData(prev => ({ ...prev, image: data.secure_url }));
          } catch (err) {
            console.error('Upload error:', err);
            alert('Lỗi upload ảnh: ' + err.message);
          }
          setUploading(false);
          e.target.value = '';
        };

        const handleSubmit = async (e) => {
          e.preventDefault();
          setSaving(true);
          const payload = {
            ...formData,
            variants: normalizeVariants(formData.variants, formData.price),
            attributes: normalizeAttributes(formData.attributes),
          };
          await onSave(payload);
          setSaving(false);
        };

        if (!show) return null;

        return (
          <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content" style={{ borderRadius: 16, border: 'none', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <div className="modal-header" style={{ background: 'linear-gradient(135deg, #ffc107, #ff9800)', border: 'none', borderRadius: '16px 16px 0 0' }}>
                  <h5 className="modal-title fw-bold text-dark">
                    <i className="fas fa-box me-2"></i>{product ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
                  </h5>
                  <button type="button" className="btn-close" onClick={onClose}></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <div className="row">
                      <div className="col-md-8">
                        <div className="mb-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-tag me-1"></i>Tên sản phẩm *
                          </label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})} 
                            placeholder="Ví dụ: Xy lanh nghiêng KTM"
                            required
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                          />
                        </div>
                        <div className="row">
                          <div className="col-6">
                            <label className="form-label fw-semibold small text-muted mb-1">
                              <i className="fas fa-hashtag me-1"></i>Mã sản phẩm
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
                            <label className="form-label fw-semibold small text-muted mb-1">
                              <i className="fas fa-dollar-sign me-1"></i>Giá bán
                            </label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={formData.price} 
                              onChange={handlePriceChange} 
                              placeholder="1.950.000đ"
                              style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                            />
                          </div>
                        </div>
                        <div className="mb-3 mt-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-percent me-1"></i>Hoa hồng (%)
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
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-list me-1"></i>Danh mục
                          </label>
                          <select 
                            className="form-select" 
                            value={formData.category} 
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                          >
                            <option value="">Chọn danh mục</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-sticky-note me-1"></i>Ghi chú
                          </label>
                          <textarea 
                            className="form-control" 
                            rows="2" 
                            value={formData.note} 
                            onChange={(e) => setFormData({...formData, note: e.target.value})} 
                            placeholder="Ví dụ: Thêm dây là 2.150.000đ"
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                          />
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-sliders-h me-1"></i>Thuộc tính (cân nặng, chiều dài, ...)
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