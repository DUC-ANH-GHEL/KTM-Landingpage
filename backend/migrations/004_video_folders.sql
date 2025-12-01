-- Migration: Add video folders system
-- Run this in Neon SQL Editor AFTER 003_create_videos_table.sql

-- Create video_folders table
CREATE TABLE IF NOT EXISTS video_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  cover_image TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add folder_id to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES video_folders(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_videos_folder_id ON videos(folder_id);

-- Seed default folders
INSERT INTO video_folders (id, name, slug, description, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Video hướng dẫn', 'huong-dan', 'Các video hướng dẫn lắp đặt và sử dụng sản phẩm', 1),
  ('22222222-2222-2222-2222-222222222222', 'Shorts', 'shorts', 'Video ngắn mẹo hay', 2)
ON CONFLICT (slug) DO NOTHING;

-- Update existing videos to belong to folders
UPDATE videos SET folder_id = '11111111-1111-1111-1111-111111111111' WHERE category = 'instruction' AND folder_id IS NULL;
UPDATE videos SET folder_id = '22222222-2222-2222-2222-222222222222' WHERE category = 'shorts' AND folder_id IS NULL;

-- Optional: Drop category column if no longer needed (comment out if you want to keep it)
-- ALTER TABLE videos DROP COLUMN IF EXISTS category;
