-- NHSCA Team Hub — shared media gallery (photos & videos for families).
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS nhsca_hub_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL DEFAULT 'nhsca-duals-2026',
  user_id UUID NOT NULL,
  uploader_email TEXT,
  uploader_name TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  filename TEXT,
  caption TEXT,
  content_type TEXT,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nhsca_hub_media_event_created
  ON nhsca_hub_media (event_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nhsca_hub_media_user
  ON nhsca_hub_media (user_id);

COMMENT ON TABLE nhsca_hub_media IS 'NHSCA team hub — parent-shared photos and videos; admins delete via API.';
