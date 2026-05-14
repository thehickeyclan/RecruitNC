-- fundraising-videos bucket: private, 100MB max, video + JPEG poster MIME types.
-- Paths: athlete/{athlete_id}/fundraising.{mp4|webm|mov}, thankyou.*, *-thumb.jpg
--
-- Uses parent_athlete_links + athletes.claimed_by_user_id + user_profiles.is_admin
-- (no user_profiles.athlete_id — that column may not exist in your DB).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fundraising-videos',
  'fundraising-videos',
  false,
  104857600,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Fundraising videos: linked parents and athletes can upload" ON storage.objects;
DROP POLICY IF EXISTS "Fundraising videos: linked parents and athletes can update" ON storage.objects;
DROP POLICY IF EXISTS "Fundraising videos: linked parents and athletes can delete" ON storage.objects;

CREATE POLICY "Fundraising videos: linked parents and athletes can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'fundraising-videos'
  AND (string_to_array(name, '/'))[1] = 'athlete'
  AND (
    EXISTS (
      SELECT 1 FROM public.parent_athlete_links pal
      WHERE pal.user_id = auth.uid()
        AND pal.athlete_id::text = (string_to_array(name, '/'))[2]
    )
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id::text = (string_to_array(name, '/'))[2]
        AND a.claimed_by_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.is_admin IS TRUE
    )
  )
);

CREATE POLICY "Fundraising videos: linked parents and athletes can update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'fundraising-videos'
  AND (string_to_array(name, '/'))[1] = 'athlete'
  AND (
    EXISTS (
      SELECT 1 FROM public.parent_athlete_links pal
      WHERE pal.user_id = auth.uid()
        AND pal.athlete_id::text = (string_to_array(name, '/'))[2]
    )
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id::text = (string_to_array(name, '/'))[2]
        AND a.claimed_by_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.is_admin IS TRUE
    )
  )
);

CREATE POLICY "Fundraising videos: linked parents and athletes can delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'fundraising-videos'
  AND (string_to_array(name, '/'))[1] = 'athlete'
  AND (
    EXISTS (
      SELECT 1 FROM public.parent_athlete_links pal
      WHERE pal.user_id = auth.uid()
        AND pal.athlete_id::text = (string_to_array(name, '/'))[2]
    )
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id::text = (string_to_array(name, '/'))[2]
        AND a.claimed_by_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.is_admin IS TRUE
    )
  )
);
