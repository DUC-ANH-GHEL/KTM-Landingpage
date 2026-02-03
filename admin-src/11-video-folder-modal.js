    function VideoFolderModal({ show, folder, onClose, onSave }) {
      const [formData, setFormData] = useState({ name: '', description: '', sortOrder: 0, coverImage: '' });
      const [saving, setSaving] = useState(false);
      const [uploading, setUploading] = useState(false);

      useEffect(() => {
        if (folder) {
          setFormData({
            name: folder.name || '',
            description: folder.description || '',
            sortOrder: folder.sortOrder || 0,
            coverImage: folder.coverImage || ''
          });
        } else {
          setFormData({ name: '', description: '', sortOrder: 0, coverImage: '' });
        }
      }, [folder, show]);

      const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);

        try {
          const data = await window.KTM.cloudinary.uploadImage({
            file,
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
          });
          if (data.secure_url) {
            setFormData(prev => ({ ...prev, coverImage: data.secure_url }));
          }
          // Xóa cache khi cập nhật
          window.KTM.cache.remove(CACHE_KEY);
          showToast('Cập nhật thành công!', 'success');
          setShowQuickEdit(false);
          setEditingItem(null);
          // Reload data
          loadAllData();
        } catch (err) {
          console.error('Cloudinary upload error:', err);
          alert('Lỗi upload ảnh: ' + (err.message || err));
        } finally {
          setUploading(false);
        }
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
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{folder ? 'Sửa Folder' : 'Tạo Folder mới'}</h5>
                <button type="button" className="btn-close" onClick={onClose}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Tên folder *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Mô tả</label>
                    <textarea
                      className="form-control"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="2"
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Thứ tự</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ảnh bìa</label>
                    <div className="d-flex align-items-start gap-3">
                      {formData.coverImage ? (
                        <div className="position-relative">
                          <img 
                            src={formData.coverImage} 
                            alt="Cover" 
                            className="rounded"
                            style={{ width: 120, height: 80, objectFit: 'cover' }}
                          />
                          <button 
                            type="button"
                            className="btn btn-sm btn-danger position-absolute top-0 end-0"
                            onClick={() => setFormData({ ...formData, coverImage: '' })}
                            style={{ transform: 'translate(30%, -30%)' }}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="bg-light rounded d-flex align-items-center justify-content-center text-muted"
                          style={{ width: 120, height: 80 }}
                        >
                          <i className="fas fa-image fa-2x"></i>
                        </div>
                      )}
                      <div className="flex-grow-1">
                        <input
                          type="file"
                          className="form-control form-control-sm"
                          accept="image/*,image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleImageUpload}
                          disabled={uploading}
                        />
                        {uploading && (
                          <div className="mt-1 text-muted small">
                            <span className="spinner-border spinner-border-sm me-1"></span>
                            Đang upload...
                          </div>
                        )}
                        <div className="mt-1 text-muted small">Hoặc dán URL:</div>
                        <input
                          type="url"
                          className="form-control form-control-sm"
                          placeholder="https://..."
                          value={formData.coverImage}
                          onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-warning" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</> : 'Lưu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

