    function AlbumList({ albums, onSelect, onCreate, onEdit, onDelete, loading, currentFolder, onBack, breadcrumb }) {
      return (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center">
              {currentFolder && (
                <button className="btn btn-outline-secondary me-3" onClick={onBack}>
                  <i className="fas fa-arrow-left"></i>
                </button>
              )}
              <h4 className="m-0">
                <i className="fas fa-folder me-2 text-warning"></i>
                {currentFolder ? currentFolder.title : 'Thư viện ảnh'}
              </h4>
            </div>
            <button className="btn btn-warning" onClick={onCreate}>
              <i className="fas fa-folder-plus me-1"></i>Tạo Folder
            </button>
          </div>

          {/* Breadcrumb */}
          {breadcrumb && breadcrumb.length > 0 && (
            <nav aria-label="breadcrumb" className="mb-3">
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <a href="#" onClick={(e) => { e.preventDefault(); onBack('root'); }} className="text-warning">
                    <i className="fas fa-home"></i>
                  </a>
                </li>
                {breadcrumb.map((item, idx) => (
                  <li key={item.id} className={`breadcrumb-item ${idx === breadcrumb.length - 1 ? 'active' : ''}`}>
                    {idx === breadcrumb.length - 1 ? (
                      item.title
                    ) : (
                      <a href="#" onClick={(e) => { e.preventDefault(); onBack(item); }} className="text-warning">
                        {item.title}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-warning"></div>
            </div>
          ) : albums.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
              <p className="text-muted">
                {currentFolder ? 'Folder này đang trống' : 'Chưa có folder nào. Hãy tạo folder đầu tiên!'}
              </p>
            </div>
          ) : (
            <div className="row g-3">
              {albums.map(album => (
                <div key={album.uuid || album.id} className="col-6 col-md-4 col-lg-3">
                  <div className="card album-card h-100" onClick={() => onSelect(album)}>
                    {album.cover ? (
                      <img 
                        src={album.cover} 
                        className="album-cover" 
                        alt={album.title}
                      />
                    ) : (
                      <div className="card-body text-center py-4">
                        <i className="fas fa-folder fa-3x text-warning mb-2"></i>
                      </div>
                    )}
                    <div className="card-body">
                      <h6 className="card-title mb-1">{album.title}</h6>
                      <small className="text-muted">
                        {album.subfolderCount > 0 && <span><i className="fas fa-folder me-1"></i>{album.subfolderCount}</span>}
                        {album.subfolderCount > 0 && album.count > 0 && ' • '}
                        {album.count > 0 && <span><i className="fas fa-image me-1"></i>{album.count}</span>}
                        {album.subfolderCount === 0 && album.count === 0 && 'Trống'}
                      </small>
                    </div>
                    <div className="card-footer bg-transparent border-0 pt-0">
                      <button 
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={(e) => { e.stopPropagation(); onEdit(album); }}
                        title="Sửa album"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={(e) => { e.stopPropagation(); onDelete(album); }}
                        title="Xóa album"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Create/Edit Album Modal
