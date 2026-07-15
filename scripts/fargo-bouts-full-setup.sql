-- Fargo bout-level SoR harden (run after fargo-results-harden-setup.sql). Safe to re-run.

ALTER TABLE public.fargo_bouts
  ADD COLUMN IF NOT EXISTS athlete_state text,
  ADD COLUMN IF NOT EXISTS athlete_club text,
  ADD COLUMN IF NOT EXISTS opponent_club text,
  ADD COLUMN IF NOT EXISTS source_adapter text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Prefer stable source match ids when present.
CREATE UNIQUE INDEX IF NOT EXISTS fargo_bouts_source_match_athlete_uidx
  ON public.fargo_bouts (
    year,
    style,
    age_division,
    gender,
    weight_class,
    lower(trim(athlete_name)),
    coalesce(nullif(trim(source_match_id), ''), ''),
    coalesce(match_order, -1),
    lower(trim(coalesce(opponent_name, '')))
  );

CREATE INDEX IF NOT EXISTS idx_fargo_bouts_nc
  ON public.fargo_bouts (year, style)
  WHERE athlete_state = 'NC';

CREATE INDEX IF NOT EXISTS idx_fargo_bouts_source_event
  ON public.fargo_bouts (source_event_id)
  WHERE source_event_id IS NOT NULL;

COMMENT ON COLUMN public.fargo_bouts.source_adapter IS
  'usa_bracketing | trackwrestling — Flo never SoR.';
