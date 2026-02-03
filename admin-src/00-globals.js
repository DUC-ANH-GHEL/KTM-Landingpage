const { useState, useEffect, useRef, useMemo } = React;

    // Cloudinary config - Cần tạo unsigned upload preset tên "ktm_unsigned" trên Cloudinary Dashboard
    // Settings -> Upload -> Upload presets -> Add upload preset -> Signing Mode: Unsigned
    const CLOUDINARY_CLOUD_NAME = 'diwxfpt92';
    const CLOUDINARY_UPLOAD_PRESET = 'ktm_unsigned'; 

    // API Base - Vercel dev chạy ở port 3000, dùng chung domain
    const API_BASE = '';

