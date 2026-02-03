    function VideoModal({ show, video, onClose, onSave }) {
      const [formData, setFormData] = useState({
        title: '',
        youtube_url: '',
        thumbnail_url: '',
        sort_order: 0
      });
      const [saving, setSaving] = useState(false);
      const [previewThumb, setPreviewThumb] = useState('');

      useEffect(() => {
        if (video) {
          setFormData({
            title: video.title || '',
            youtube_url: `https://www.youtube.com/watch?v=${video.youtubeId}`,
            thumbnail_url: video.thumb || '',
            sort_order: video.sortOrder || 0,
          });
          setPreviewThumb(video.thumb);
        } else {
          setFormData({
            title: '',
            youtube_url: '',
            thumbnail_url: '',
            sort_order: 0
          });
          setPreviewThumb('');
        }
      }, [video, show]);

      const extractYoutubeId = (url) => {
        const match = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
      };

      const handleUrlChange = (url) => {
        setFormData({ ...formData, youtube_url: url });
        const videoId = extractYoutubeId(url);
        if (videoId) {
          setPreviewThumb(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
        }
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSave(formData);
        setSaving(false);
      };

      if (!show) return null;

      return (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{video ? 'Sửa Video' : 'Thêm Video mới'}</h5>
                <button type="button" className="btn-close" onClick={onClose}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Link YouTube *</label>
                    <input
                      type="url"
                      className="form-control"
                      value={formData.youtube_url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... hoặc shorts/..."
                      required
                    />
                    <small className="text-muted">Hỗ trợ: youtube.com/watch, youtu.be, youtube.com/shorts</small>
                  </div>

                  {previewThumb && (
                    <div className="mb-3 text-center">
                      <img src={previewThumb} alt="Preview" className="img-fluid rounded" style={{ maxHeight: '150px' }} />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Tiêu đề *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Thứ tự</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Thumbnail tùy chỉnh (tùy chọn)</label>
                    <input
                      type="url"
                      className="form-control"
                      value={formData.thumbnail_url}
                      onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                      placeholder="Để trống sẽ dùng thumbnail mặc định của YouTube"
                    />
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

