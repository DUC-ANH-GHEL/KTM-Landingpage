// components/ImageModal.js
// Modal phóng to ảnh đơn giản

function ImageModal({ src, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="image-modal-container" onClick={(e) => e.stopPropagation()}>
        <img 
          src={src} 
          alt="Enlarged" 
          className="img-fluid rounded image-modal-img"
        />
        
        {/* Nút đóng */}
        <button className="image-modal-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
}
