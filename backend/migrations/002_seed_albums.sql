-- migrations/002_seed_albums.sql
-- Dữ liệu mẫu - chạy sau khi đã tạo bảng

-- Insert albums
INSERT INTO albums (slug, title, description, cover_url) VALUES
('kubota', 'Máy cày Kubota', 'Bộ sưu tập lắp đặt thủy lực cho các dòng máy Kubota', 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762120/combo_van_2_tay_2_ty_nghi%C3%AAng_gi%E1%BB%AFa_KTM_bwpf3o.jpg'),
('yanmar', 'Máy cày Yanmar', 'Bộ sưu tập lắp đặt thủy lực cho các dòng máy Yanmar', 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749300157/Combo_van_3_tay_xylanh_gi%E1%BB%AFa_mxdsth.jpg'),
('xuc-lat', 'Xe xúc lật / máy khác', 'Bộ sưu tập lắp đặt thủy lực cho xe xúc lật và các loại máy khác', 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749135217/Combo_van_4_tay_1_xylanh_nghi%C3%AAng_1_xylanh_gi%E1%BB%AFa_nh6gjh.jpg')
ON CONFLICT (slug) DO NOTHING;

-- Insert images cho album Kubota
INSERT INTO images (album_id, url, caption, sort_order) VALUES
((SELECT id FROM albums WHERE slug='kubota'), 'https://res.cloudinary.com/diwxfpt92/image/upload/v1747538306/1_hh8ucd.jpg', 'Kubota L1501 - Lắp van 3 tay', 1),
((SELECT id FROM albums WHERE slug='kubota'), 'https://res.cloudinary.com/diwxfpt92/image/upload/v1747538306/2_sxq2wa.jpg', 'Trước khi lắp', 2),
((SELECT id FROM albums WHERE slug='kubota'), 'https://res.cloudinary.com/diwxfpt92/image/upload/v1747538306/2_sxq2wa.jpg', 'Sau khi lắp combo van', 3);

-- Insert images cho album Yanmar  
INSERT INTO images (album_id, url, caption, sort_order) VALUES
((SELECT id FROM albums WHERE slug='yanmar'), 'https://res.cloudinary.com/diwxfpt92/image/upload/v1747538307/3_nxbqyo.jpg', 'Yanmar F14 - sau lắp', 1);

-- Insert images cho album Xúc lật
INSERT INTO images (album_id, url, caption, sort_order) VALUES
((SELECT id FROM albums WHERE slug='xuc-lat'), 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749269320/bao-gia-trang-gat-doc-lap_exzhpm.jpg', 'Xe xúc lật 920 - Lắp full combo', 1);
