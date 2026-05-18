-- Run in Supabase SQL Editor (RecruitNC production) if logs show:
--   user_profiles.athlete_id does not exist (Postgres 42703)
-- Links a login's profile row to the athlete row they "are" (wrestler account / primary athlete).
-- Parent↔athlete management also uses parent_athlete_links.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_athlete_id ON public.user_profiles(athlete_id)
  WHERE athlete_id IS NOT NULL;
