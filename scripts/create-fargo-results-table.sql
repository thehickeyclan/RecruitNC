-- Fargo Nationals (US Marine Corps National Championships) — NC freestyle results.
-- Run in Supabase SQL Editor before importing scripts/data/fargo_results_seed.csv

CREATE TABLE IF NOT EXISTS public.fargo_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  athlete_name text NOT NULL,
  first_name text,
  last_name text,
  division text NOT NULL,
  weight_class text NOT NULL,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  record text,
  placement integer,
  is_all_american boolean NOT NULL DEFAULT false,
  high_school text,
  notes text,
  event_name text NOT NULL DEFAULT 'US Marine Corps National Championships (Fargo)',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fargo_results_athlete_name ON public.fargo_results (athlete_name);
CREATE INDEX IF NOT EXISTS idx_fargo_results_year ON public.fargo_results (year);
CREATE INDEX IF NOT EXISTS idx_fargo_results_high_school ON public.fargo_results (high_school);
CREATE INDEX IF NOT EXISTS idx_fargo_results_year_division ON public.fargo_results (year, division);

ALTER TABLE public.fargo_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fargo_results_public_read" ON public.fargo_results;
CREATE POLICY "fargo_results_public_read"
  ON public.fargo_results
  FOR SELECT
  TO anon, authenticated
  USING (true);
