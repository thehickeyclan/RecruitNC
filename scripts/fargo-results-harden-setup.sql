-- Harden fargo_results for canonical Fargo Nationals SoR (Phase 1).
-- Run in Supabase SQL Editor before promoting Fargo import batches.
-- Safe to re-run.

ALTER TABLE public.fargo_results
  ADD COLUMN IF NOT EXISTS style text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS age_division text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS club text,
  ADD COLUMN IF NOT EXISTS athlete_id uuid,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_label text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS retrieved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill structured fields from legacy division string (e.g. "Junior Boys Freestyle").
UPDATE public.fargo_results
SET
  style = CASE
    WHEN division ILIKE '%greco%' THEN 'GR'
    ELSE 'FS'
  END,
  gender = CASE
    WHEN division ILIKE '%girl%' OR division ILIKE '%women%' OR division ILIKE '% female%' THEN 'F'
    ELSE 'M'
  END,
  age_division = CASE
    WHEN division ILIKE '%16u%' OR division ILIKE '%16-u%' OR division ILIKE '%cadet%' THEN '16U'
    WHEN division ILIKE '%junior%' THEN 'Junior'
    ELSE COALESCE(NULLIF(trim(age_division), ''), 'Unknown')
  END
WHERE style IS NULL OR gender IS NULL OR age_division IS NULL;

UPDATE public.fargo_results SET style = 'FS' WHERE style IS NULL;
UPDATE public.fargo_results SET gender = 'M' WHERE gender IS NULL;
UPDATE public.fargo_results SET age_division = 'Unknown' WHERE age_division IS NULL OR trim(age_division) = '';

ALTER TABLE public.fargo_results
  ALTER COLUMN style SET DEFAULT 'FS',
  ALTER COLUMN gender SET DEFAULT 'M',
  ALTER COLUMN age_division SET DEFAULT 'Unknown';

DO $$
BEGIN
  ALTER TABLE public.fargo_results ALTER COLUMN style SET NOT NULL;
  ALTER TABLE public.fargo_results ALTER COLUMN gender SET NOT NULL;
  ALTER TABLE public.fargo_results ALTER COLUMN age_division SET NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'NOT NULL constraints skipped: %', SQLERRM;
END $$;

-- Season grain natural key: FS and GR (and age/gender) never share a slot.
CREATE UNIQUE INDEX IF NOT EXISTS fargo_results_season_natural_uidx
  ON public.fargo_results (
    year,
    style,
    age_division,
    gender,
    weight_class,
    lower(trim(athlete_name))
  );

CREATE INDEX IF NOT EXISTS idx_fargo_results_style_year
  ON public.fargo_results (style, year);
CREATE INDEX IF NOT EXISTS idx_fargo_results_athlete_id
  ON public.fargo_results (athlete_id)
  WHERE athlete_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fargo_results_aa
  ON public.fargo_results (year, is_all_american)
  WHERE is_all_american = true;

COMMENT ON COLUMN public.fargo_results.style IS 'FS = Freestyle, GR = Greco-Roman — independent careers.';
COMMENT ON COLUMN public.fargo_results.age_division IS '16U or Junior (canonical).';
COMMENT ON COLUMN public.fargo_results.gender IS 'M or F.';
COMMENT ON COLUMN public.fargo_results.verification_status IS 'unverified | staged | verified — never silently overwrite verified.';

-- Phase 2 placeholder (bout-level SoR). Create empty until adapters land.
CREATE TABLE IF NOT EXISTS public.fargo_bouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  style text NOT NULL CHECK (style IN ('FS', 'GR')),
  gender text NOT NULL CHECK (gender IN ('M', 'F')),
  age_division text NOT NULL,
  weight_class text NOT NULL,
  athlete_name text NOT NULL,
  athlete_id uuid,
  opponent_name text,
  opponent_state text,
  round text,
  result_type text,
  score text,
  win boolean,
  match_order integer,
  source_event_id text,
  source_bracket_id text,
  source_match_id text,
  source_url text,
  source_payload jsonb,
  verification_status text NOT NULL DEFAULT 'unverified',
  retrieved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fargo_bouts_athlete_year
  ON public.fargo_bouts (year, style, age_division, lower(trim(athlete_name)));

ALTER TABLE public.fargo_bouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fargo_bouts_public_read" ON public.fargo_bouts;
CREATE POLICY "fargo_bouts_public_read"
  ON public.fargo_bouts FOR SELECT TO anon, authenticated USING (true);

COMMENT ON TABLE public.fargo_bouts IS
  'Phase 2 Fargo match-level SoR (USA Bracketing / historical Track adapters). Season aggregates remain in fargo_results.';
