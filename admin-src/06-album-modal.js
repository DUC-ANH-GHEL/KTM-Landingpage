    function AlbumModal({ show, album, onClose, onSave, parentId }) {
      const [formData, setFormData] = useState({ slug: '', title: '', description: '', cover_url: '', parent_id: null });
      const [saving, setSaving] = useState(false);
      const [uploadingCover, setUploadingCover] = useState(false);
      const coverInputRef = useRef(null);

      useEffect(() => {
        if (album) {
          setFormData({
            slug: album.id || '',
            title: album.title || '',
            description: album.description || '',
            cover_url: album.cover || '',
            parent_id: album.parentId || null
          });
        } else {
          setFormData({ slug: '', title: '', description: '', cover_url: '', parent_id: parentId || null });
        }
      }, [album, show, parentId]);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSave(formData);
        setSaving(false);
      };

      const generateSlug = (title) => {
        return title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[đĐ]/g, 'd')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      };

      // Nén ảnh bìa (hỗ trợ iPhone HEIC)
      const compressCoverImage = async (file) => {
        const maxSize = 2 * 1024 * 1024; // 2MB
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name);
        
        // Nếu file nhỏ và không phải HEIC, không cần nén
        if (file.size <= maxSize && !isHeic) {
          return file;
        }
        
        try {
          const bitmap = await createImageBitmap(file);
          const canvas = document.createElement('canvas');
          
          // Resize max 800px cho cover
          let width = bitmap.width;
          let height = bitmap.height;
          const maxDimension = 800;
          
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
          console.error('Compress cover error:', err);
          throw new Error('Không thể xử lý ảnh. Thử chọn ảnh khác.');
        }
      };

      // Upload cover image to Cloudinary
      const handleCoverUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type (hỗ trợ Safari iOS - type có thể rỗng)
        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);
        if (!isImage) {
          alert('Vui lòng chọn file ảnh!');
          return;
        }
        
        setUploadingCover(true);
        try {
          // Nén ảnh trước khi upload (convert HEIC -> JPEG)
          const compressedFile = await compressCoverImage(file);

          const data = await window.KTM.cloudinary.uploadImage({
            file: compressedFile,
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            folder: 'ktm-albums/covers',
          });

          if (!data.secure_url) {
            console.error('Cloudinary error:', data);
            throw new Error(data.error?.message || 'Upload failed');
          }

          setFormData(prev => ({ ...prev, cover_url: data.secure_url }));
        } catch (err) {
          console.error('Cover upload error:', err);
          alert('Lỗi upload ảnh bìa: ' + err.message);
        }
        setUploadingCover(false);
        // Reset input để có thể chọn lại cùng file
        e.target.value = '';
      };

      if (!show) return null;

      return (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {album ? 'Sửa' : 'Tạo'} Folder
                </h5>
                <button type="button" className="btn-close" onClick={onClose}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Tên Folder *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.title}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        title: e.target.value,
                        slug: formData.slug || generateSlug(e.target.value)
                      })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Slug (URL) *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                      disabled={!!album}
                    />
                    <small className="text-muted">VD: may-cay-kubota-l1501</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Mô tả</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ảnh bìa</label>
                    <div className="d-flex gap-2 align-items-start">
                      {formData.cover_url && (
                        <div className="position-relative" style={{width: 80, height: 80}}>
                          <img 
                            src={formData.cover_url} 
                            alt="Cover" 
                            style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8}}
                          />
                          <button 
                            type="button"
                            className="btn btn-sm btn-danger position-absolute"
                            style={{top: -8, right: -8, padding: '2px 6px', fontSize: 10}}
                            onClick={() => setFormData(prev => ({ ...prev, cover_url: '' }))}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      )}
                      <div className="flex-grow-1">
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          className="d-none"
                          onChange={handleCoverUpload}
                        />
                        <button 
                          type="button"
                          className="btn btn-outline-secondary w-100 mb-2"
                          onClick={() => coverInputRef.current?.click()}
                          disabled={uploadingCover}
                        >
                          {uploadingCover ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span>Đang upload...</>
                          ) : (
                            <><i className="fas fa-upload me-2"></i>Upload ảnh bìa</>
                          )}
                        </button>
                        <input
                          type="url"
                          className="form-control form-control-sm"
                          value={formData.cover_url}
                          onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                          placeholder="Hoặc dán URL ảnh..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-warning" disabled={saving || uploadingCover}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</> : 'Lưu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // Folder Tree Item Component - Hiển thị dạng cây thư mục
