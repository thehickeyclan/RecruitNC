-- Run in Supabase SQL Editor after scholarships portal DDL.
-- Adds video submission support (YouTube/Vimeo URL and/or Vercel Blob upload URL).

ALTER TABLE public.scholarship_applications
  ADD COLUMN IF NOT EXISTS submission_format text NOT NULL DEFAULT 'written';

ALTER TABLE public.scholarship_applications
  DROP CONSTRAINT IF EXISTS scholarship_applications_submission_format_chk;

ALTER TABLE public.scholarship_applications
  ADD CONSTRAINT scholarship_applications_submission_format_chk
  CHECK (submission_format IN ('written', 'video'));

ALTER TABLE public.scholarship_applications
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.scholarship_applications
  ADD COLUMN IF NOT EXISTS video_blob_url text;

COMMENT ON COLUMN public.scholarship_applications.submission_format IS 'written = essay; video = YouTube/Vimeo or uploaded file URL.';
COMMENT ON COLUMN public.scholarship_applications.video_url IS 'Public YouTube or Vimeo watch URL (e.g. unlisted).';
COMMENT ON COLUMN public.scholarship_applications.video_blob_url IS 'HTTPS URL from Vercel Blob after client upload.';
