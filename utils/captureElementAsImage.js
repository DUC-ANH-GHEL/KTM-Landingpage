// utils/captureElementAsImage.js
// Hàm chụp một element thành ảnh bằng html2canvas
import html2canvas from 'html2canvas';

export async function captureElementAsImage(element) {
  if (!element) return null;
  const canvas = await html2canvas(element, { backgroundColor: null });
  return canvas.toDataURL('image/png');
}
