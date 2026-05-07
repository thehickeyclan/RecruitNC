-- Run once in Supabase after scholarships portal tables exist.
-- Adds blind-review id + nominator fields from NC United scholarship PRD.

ALTER TABLE public.scholarship_applications
  ADD COLUMN IF NOT EXISTS anonymous_id text,
  ADD COLUMN IF NOT EXISTS is_parent_nominating_own_child boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS nominator_known_duration text;

CREATE UNIQUE INDEX IF NOT EXISTS scholarship_applications_anonymous_id_uidx
  ON public.scholarship_applications (anonymous_id)
  WHERE anonymous_id IS NOT NULL;
