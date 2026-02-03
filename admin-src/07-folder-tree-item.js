    function FolderTreeItem({ folder, allAlbums, currentAlbumId, targetAlbum, onSelect, level = 0 }) {
      const [expanded, setExpanded] = useState(true);
      const folderId = folder.uuid || folder.id;
      const isCurrentFolder = folderId === currentAlbumId;
      const isSelected = targetAlbum === folderId;
      const children = allAlbums.filter(a => a.parentId === folderId);
      const hasChildren = children.length > 0;

      return (
        <div style={{marginLeft: level * 16 + 'px'}}>
          <div 
            className={`d-flex align-items-center p-2 rounded mb-1 ${isSelected ? 'bg-info text-white' : isCurrentFolder ? 'bg-light text-muted' : 'hover-bg'}`}
            style={{
              cursor: isCurrentFolder ? 'not-allowed' : 'pointer',
              opacity: isCurrentFolder ? 0.5 : 1,
              transition: 'background 0.2s'
            }}
            onClick={() => !isCurrentFolder && onSelect(folderId)}
          >
            {hasChildren && (
              <i 
                className={`fas fa-chevron-${expanded ? 'down' : 'right'} me-2`}
                style={{fontSize: '10px', width: '12px', cursor: 'pointer'}}
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              ></i>
            )}
            {!hasChildren && <span style={{width: '20px'}}></span>}
            <i className={`fas fa-folder${isSelected ? '-open' : ''} me-2 ${isSelected ? '' : 'text-warning'}`}></i>
            <span className="small">{folder.title}</span>
            {isCurrentFolder && <span className="ms-2 badge bg-secondary" style={{fontSize: '9px'}}>Hiện tại</span>}
            {folder.count > 0 && !isCurrentFolder && (
              <span className="ms-auto badge bg-light text-muted" style={{fontSize: '10px'}}>{folder.count}</span>
            )}
          </div>
          
          {expanded && hasChildren && (
            <div>
              {children.map(child => (
                <FolderTreeItem
                  key={child.uuid || child.id}
                  folder={child}
                  allAlbums={allAlbums}
                  currentAlbumId={currentAlbumId}
                  targetAlbum={targetAlbum}
                  onSelect={onSelect}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // Album Detail View (manage images)
