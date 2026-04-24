// components/ImageModalWithInfo.js
import React, { useRef } from 'react';
import { captureElementAsImage } from '../utils/captureElementAsImage';

function ImageModalWithInfo({ src, name, price, onClose }) {
  const infoRef = useRef();

  const handleScreenshot = async () => {
    if (!infoRef.current) return;
    const dataUrl = await captureElementAsImage(infoRef.current);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${name || 'screenshot'}.png`;
    link.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="image-modal-container" onClick={e => e.stopPropagation()}>
        <img src={src} alt={name || 'Ảnh sản phẩm'} className="img-fluid rounded image-modal-img" />
        <div ref={infoRef} style={{display: 'inline-block', marginTop: 16, textAlign: 'center'}}>
          {name && <div className="fw-bold mb-1">{name}</div>}
          {price && <div className="text-danger fw-bold mb-2">{price}</div>}
        </div>
        <button className="btn btn-outline-primary btn-sm mt-2" onClick={handleScreenshot}>
          <i className="fas fa-camera me-1"></i>Chụp màn hình khu vực này
        </button>
        <button className="image-modal-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
}

export default ImageModalWithInfo;
