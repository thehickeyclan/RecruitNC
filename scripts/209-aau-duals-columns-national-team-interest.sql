-- AAU Scholastic Duals: same roster pattern as NHSCA (Team 1 / Team 2 + starter per weight).
-- Run once in Supabase SQL Editor if Admin → National team submissions → AAU roster actions fail.

ALTER TABLE public.national_team_interest_forms
  ADD COLUMN IF NOT EXISTS aau_duals_team text,
  ADD COLUMN IF NOT EXISTS aau_duals_starter boolean DEFAULT false;

COMMENT ON COLUMN public.national_team_interest_forms.aau_duals_team IS 'AAU duals roster: team_1 | team_2 (admin national-team submissions).';
COMMENT ON COLUMN public.national_team_interest_forms.aau_duals_starter IS 'True if starter at primary_weight for that AAU team.';
