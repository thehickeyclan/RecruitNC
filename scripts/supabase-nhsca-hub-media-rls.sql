-- NHSCA Team Hub media — RLS policies (run if uploads fail with "row-level security").
-- Safe to re-run. Hub API writes use service role; these policies unblock that path.

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
