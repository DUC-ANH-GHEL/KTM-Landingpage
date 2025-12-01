-- Migration: Create videos table
-- Run this in Neon SQL Editor

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  youtube_id VARCHAR(20) NOT NULL,
  thumbnail_url TEXT,
  category VARCHAR(50) DEFAULT 'instruction',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on youtube_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);

-- Seed initial data from current hardcoded videos
INSERT INTO videos (title, youtube_id, thumbnail_url, category, sort_order) VALUES
  ('Báo giá trang gạt độc lập', 'U9v6y7kIJ9A', 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749269320/bao-gia-trang-gat-doc-lap_exzhpm.jpg', 'instruction', 1),
  ('Báo giá trang gạt trên xới', 'oLC34LfasrI', 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749269576/bao-gia-trang-gat-tren-xoi_u9jocc.jpg', 'instruction', 2),
  ('Trang gạt', 'GEt7NB5GwIU', 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749277751/Trang-gat_fmkuqw.jpg', 'instruction', 3),
  ('Hướng dẫn lắp đặt', '2MLY9YJrroU', 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/youtube1_y63sbd.jpg', 'instruction', 4),
  ('Video hướng dẫn 5', 'x2TQKWooJEQ', 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/youtube4_ykmqip.jpg', 'instruction', 5),
  ('Video hướng dẫn 6', '_M6O7gCgdAc', 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/youtube5_dy8uj1.jpg', 'instruction', 6)
ON CONFLICT (youtube_id) DO NOTHING;

-- Seed shorts videos
INSERT INTO videos (title, youtube_id, category, sort_order) VALUES
  ('Short 1', 'UCreMHzob5c', 'shorts', 1),
  ('Short 2', 'X7KeEUeH08s', 'shorts', 2),
  ('Short 3', 'aRGJaryWCZM', 'shorts', 3),
  ('Short 4', '1jUJZ3JVYrE', 'shorts', 4),
  ('Short 5', 'P4B9jBiCumw', 'shorts', 5),
  ('Short 6', 'FEDQpcHVzEA', 'shorts', 6),
  ('Short 7', 'sg45zTOzlr8', 'shorts', 7),
  ('Short 8', 'VuPrPSkBtNE', 'shorts', 8),
  ('Short 9', '7aGK8dR8pK0', 'shorts', 9)
ON CONFLICT (youtube_id) DO NOTHING;
