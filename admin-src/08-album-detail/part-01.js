    function AlbumDetail({ album, onBack, onRefresh, showToast, onNavigateToFolder, onEditSubfolder, parentAlbum }) {
      const [images, setImages] = useState([]);
      const [subfolders, setSubfolders] = useState([]);
      const [loading, setLoading] = useState(true);
      const [uploading, setUploading] = useState(false);
      const [uploadProgress, setUploadProgress] = useState('');
      const [uploadFiles, setUploadFiles] = useState([]);
      const [uploadPreviews, setUploadPreviews] = useState([]);
      const [captions, setCaptions] = useState({});
      const [previewImage, setPreviewImage] = useState(null);
      const [showCreateFolder, setShowCreateFolder] = useState(false);
      const [newFolderName, setNewFolderName] = useState('');
      const [creatingFolder, setCreatingFolder] = useState(false);
      const fileInputRef = useRef(null);
      const dropZoneRef = useRef(null);
      
      // Move image states
      const [showMoveModal, setShowMoveModal] = useState(false);
      const [selectedImages, setSelectedImages] = useState([]);
      const [allAlbums, setAllAlbums] = useState([]);
      const [targetAlbum, setTargetAlbum] = useState('');
      const [moving, setMoving] = useState(false);

      // Nén ảnh cho iPhone (HEIC, file lớn)
      const compressImage = async (file, maxSizeMB = 2) => {
        const maxSize = maxSizeMB * 1024 * 1024;
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name);
        
        if (file.size <= maxSize && !isHeic) {
          return file;
        }
        
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
            }, 'image/jpeg', 0.7);
          });
        } catch (err) {
          console.error('Compress error:', err);
          throw new Error('Không thể xử lý ảnh');
        }
      };

      useEffect(() => {
        loadData();
        loadAllAlbums();
      }, [album.id, album.uuid]);

      const loadData = async () => {
        setLoading(true);
        try {
          // Load images
          const data = await window.KTM.api.getJSON(
            `${API_BASE}/api/albums/${album.uuid || album.id}`,
            'Lỗi tải dữ liệu'
          );
          setImages(data.images || []);
          
          // Load subfolders
          const subData = await window.KTM.api.getJSON(
            `${API_BASE}/api/albums?parent_id=${album.uuid || album.id}`,
            'Lỗi tải dữ liệu'
          );
          setSubfolders(Array.isArray(subData) ? subData : []);
        } catch (err) {
          console.error(err);
          showToast('Lỗi tải dữ liệu', 'danger');
        }
        setLoading(false);
      };

      // Load all albums for move dropdown
      const loadAllAlbums = async () => {
        try {
          const data = await window.KTM.api.getJSON(`${API_BASE}/api/albums`, 'Lỗi tải album');
          setAllAlbums(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Error loading albums:', err);
        }
      };

      // Toggle chọn/bỏ chọn ảnh
      const toggleSelectImage = (imgId) => {
        setSelectedImages(prev => 
          prev.includes(imgId) 
            ? prev.filter(id => id !== imgId)
            : [...prev, imgId]
        );
      };

      // Move selected images to target album
      const moveImages = async () => {
        if (!targetAlbum || selectedImages.length === 0) {
          showToast('Vui lòng chọn folder đích', 'warning');
          return;
        }

        setMoving(true);
        let successCount = 0;

        for (const imageId of selectedImages) {
          try {
            await window.KTM.api.putJSON(
              `${API_BASE}/api/images/${imageId}`,
              { album_id: targetAlbum },
              'Lỗi di chuyển ảnh'
            );
            successCount++;
          } catch (err) {
            console.error('Move error:', err);
          }
        }

        setMoving(false);
        setShowMoveModal(false);
        setSelectedImages([]);
        setTargetAlbum('');

        if (successCount > 0) {
          showToast(`Đã di chuyển ảnh thành công!`, 'success');
          loadData();
          onRefresh();
        } else {
          showToast('Di chuyển thất bại', 'danger');
        }
      };

      // Bulk delete selected images
      const [deleting, setDeleting] = useState(false);
      
      const bulkDeleteImages = async () => {
        if (selectedImages.length === 0) return;
        
        if (!confirm(`Xóa ${selectedImages.length} ảnh đã chọn? Hành động này không thể hoàn tác!`)) return;
        
        setDeleting(true);
        let successCount = 0;
        
        for (const imageId of selectedImages) {
          try {
            await window.KTM.api.deleteJSON(
              `${API_BASE}/api/images/${imageId}`,
              'Lỗi xóa ảnh'
            );
            successCount++;
          } catch (err) {
            console.error('Delete error:', err);
          }
        }
        
        setDeleting(false);
        setSelectedImages([]);
        
        if (successCount > 0) {
          showToast(`Đã xóa ${successCount} ảnh!`, 'success');
          loadData();
          onRefresh();
        } else {
          showToast('Xóa thất bại', 'danger');
        }
      };
      
      // Select all images
      const selectAllImages = () => {
        if (selectedImages.length === images.length) {
          setSelectedImages([]);
        } else {
          setSelectedImages(images.map(img => img.id));
        }
      };

      const createSubfolder = async () => {
        if (!newFolderName.trim()) return;
        
        setCreatingFolder(true);
        try {
          const slug = newFolderName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
          
          await window.KTM.api.postJSON(
            `${API_BASE}/api/albums`,
            {
              slug: slug + '-' + Date.now(),
              title: newFolderName,
              parent_id: album.uuid || album.id,
            },
            'Lỗi tạo folder'
          );
          
          showToast('Tạo folder thành công!', 'success');
          setNewFolderName('');
          setShowCreateFolder(false);
          loadData();
          onRefresh();
        } catch (err) {
          showToast(err.message, 'danger');
        }
        setCreatingFolder(false);
      };

      const deleteSubfolder = async (folder) => {
        if (!confirm(`Xóa folder "${folder.title}"? Tất cả nội dung bên trong sẽ bị xóa!`)) return;
        
        try {
          await window.KTM.api.deleteJSON(
            `${API_BASE}/api/albums/${folder.uuid || folder.id}`,
            'Lỗi xóa folder'
          );
          showToast('Đã xóa folder', 'success');
          loadData();
          onRefresh();
        } catch (err) {
          showToast('Lỗi xóa folder', 'danger');
        }
      };

      const handleFileSelect = (files) => {
        // Validate cho iOS - check cả name nếu type rỗng
        const newFiles = Array.from(files).filter(f => 
          f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(f.name)
        );
        setUploadFiles(prev => [...prev, ...newFiles]);
        
        // Create previews
        newFiles.forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
            setUploadPreviews(prev => [...prev, { file, preview: e.target.result }]);
          };
          reader.readAsDataURL(file);
        });
      };

      const removeUploadFile = (index) => {
        setUploadFiles(prev => prev.filter((_, i) => i !== index));
        setUploadPreviews(prev => prev.filter((_, i) => i !== index));
      };

      const uploadToCloudinary = async (file) => {
        const data = await window.KTM.cloudinary.uploadImage({
          file,
          cloudName: CLOUDINARY_CLOUD_NAME,
          uploadPreset: CLOUDINARY_UPLOAD_PRESET,
          folder: `ktm-albums/${album.id}`,
        });

        if (!data.secure_url) {
          console.error('Cloudinary error:', data);
          throw new Error(data.error?.message || 'Upload failed');
        }

        return data;
      };

      const handleUpload = async () => {
        if (uploadFiles.length === 0) return;

        setUploading(true);
        let successCount = 0;

        for (let i = 0; i < uploadFiles.length; i++) {
          try {
            setUploadProgress(`Đang xử lý ${i + 1}/${uploadFiles.length}...`);
            
            // Nén ảnh trước khi upload (hỗ trợ iPhone HEIC)
            const compressedFile = await compressImage(uploadFiles[i], 2);
            
            setUploadProgress(`Đang upload ${i + 1}/${uploadFiles.length}...`);
            
            // Upload to Cloudinary
            const cloudinaryRes = await uploadToCloudinary(compressedFile);
            
            // Save to DB
            await window.KTM.api.postJSON(
              `${API_BASE}/api/albums/${album.id}`,
              {
                url: cloudinaryRes.secure_url,
                caption: captions[i] || uploadFiles[i].name.replace(/\.[^/.]+$/, ''),
                sort_order: images.length + i,
              },
              'Lỗi lưu ảnh'
            );
            
            successCount++;
          } catch (err) {
            console.error('Upload error:', err);
          }
        }

        setUploading(false);
        setUploadProgress('');
        setUploadFiles([]);
        setUploadPreviews([]);
        setCaptions({});
        
        if (successCount > 0) {
          showToast(`Đã upload ${successCount} ảnh thành công!`, 'success');
          loadData();
          onRefresh();
        } else {
          showToast('Upload thất bại', 'danger');
        }
      };

      const deleteImage = async (imageId, index) => {
        if (!confirm('Xóa ảnh này?')) return;
        
        try {
          // Note: Cần API delete image - tạm thời chỉ reload
          await window.KTM.api.deleteJSON(`${API_BASE}/api/images/${imageId}`, 'Lỗi xóa ảnh');
          showToast('Đã xóa ảnh', 'success');
          loadData();
          onRefresh();
        } catch (err) {
          showToast('Lỗi xóa ảnh', 'danger');
        }
      };

      // Drag & Drop handlers
      const handleDragOver = (e) => {
        e.preventDefault();
        dropZoneRef.current?.classList.add('dragover');
      };

      const handleDragLeave = () => {
        dropZoneRef.current?.classList.remove('dragover');
      };

      const handleDrop = (e) => {
        e.preventDefault();
        dropZoneRef.current?.classList.remove('dragover');
        handleFileSelect(e.dataTransfer.files);
      };

      return (
        <div>
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="d-flex align-items-center">
              <button className="btn btn-outline-secondary me-3" onClick={onBack}>
                <i className="fas fa-arrow-left"></i>
              </button>
              <div>
                <h4 className="m-0">{album.title}</h4>
                <small className="text-muted">
                  {subfolders.length > 0 && <span>{subfolders.length} folder • </span>}
                  {images.length} ảnh
                </small>
              </div>
            </div>
            <button 
              className="btn btn-outline-warning btn-sm"
              onClick={() => setShowCreateFolder(true)}
            >
              <i className="fas fa-folder-plus me-1"></i>Tạo Folder con
            </button>
          </div>

          {/* Create Subfolder Modal */}
          {showCreateFolder && (
            <div className="card mb-4 border-warning">
              <div className="card-body">
                <h6 className="mb-3"><i className="fas fa-folder-plus me-2 text-warning"></i>Tạo folder con</h6>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tên folder..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createSubfolder()}
                    autoFocus
                  />
                  <button 
                    className="btn btn-warning"
                    onClick={createSubfolder}
                    disabled={creatingFolder || !newFolderName.trim()}
                  >
                    {creatingFolder ? <span className="spinner-border spinner-border-sm"></span> : 'Tạo'}
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subfolders */}
          {subfolders.length > 0 && (
            <div className="card mb-4">
              <div className="card-body">
                <h6 className="mb-3"><i className="fas fa-folder me-2 text-warning"></i>Folder con</h6>
                <div className="row g-2">
                  {subfolders.map(folder => (
                    <div key={folder.uuid || folder.id} className="col-6 col-md-4 col-lg-3">
                      <div 
                        className="card h-100 folder-item" 
                        style={{cursor: 'pointer'}}
                        onClick={() => onNavigateToFolder && onNavigateToFolder(folder)}
                      >
                        <div className="card-body text-center py-3">
                          <i className="fas fa-folder fa-2x text-warning mb-2"></i>
                          <div className="small fw-bold text-truncate">{folder.title}</div>
                          <small className="text-muted">
                            {folder.subfolderCount > 0 && <span>{folder.subfolderCount} folder</span>}
                            {folder.subfolderCount > 0 && folder.count > 0 && ' • '}
                            {folder.count > 0 && <span>{folder.count} ảnh</span>}
                            {folder.subfolderCount === 0 && folder.count === 0 && 'Trống'}
                          </small>
                        </div>
                        <div className="card-footer bg-transparent border-0 pt-0 text-center">
                          <button 
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={(e) => { e.stopPropagation(); onEditSubfolder && onEditSubfolder(folder); }}
                            title="Sửa folder"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={(e) => { e.stopPropagation(); deleteSubfolder(folder); }}
                            title="Xóa folder"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upload Zone */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="mb-3"><i className="fas fa-cloud-upload-alt me-2"></i>Upload ảnh mới</h6>
              
              <div 
                ref={dropZoneRef}
                className="upload-zone"
                onClick={() => fileInputRef.current?.click()}