-- NHSCA Team Hub media — tables + RLS (safe to re-run).
-- Run in Supabase SQL Editor if uploads fail with "row-level security".

-- 1) Main gallery (skip if already exists)
CREATE TABLE IF NOT EXISTS public.nhsca_hub_media (
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
  ON public.nhsca_hub_media (event_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nhsca_hub_media_user
  ON public.nhsca_hub_media (user_id);

-- 2) Likes (requires nhsca_hub_media)
CREATE TABLE IF NOT EXISTS public.nhsca_hub_media_likes (
  media_id UUID NOT NULL REFERENCES public.nhsca_hub_media(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (media_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_nhsca_hub_media_likes_media
  ON public.nhsca_hub_media_likes (media_id);

-- 3) RLS policies for API service-role writes
ALTER TABLE public.nhsca_hub_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access nhsca_hub_media" ON public.nhsca_hub_media;
CREATE POLICY "Service role full access nhsca_hub_media"
  ON public.nhsca_hub_media
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.nhsca_hub_media_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access nhsca_hub_media_likes" ON public.nhsca_hub_media_likes;
CREATE POLICY "Service role full access nhsca_hub_media_likes"
  ON public.nhsca_hub_media_likes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
