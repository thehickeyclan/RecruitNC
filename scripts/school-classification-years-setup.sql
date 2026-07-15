-- School classification year history (NCHSAA membership by cycle/season).
-- Run in Supabase SQL Editor before promoting classification import batches.
--
-- Flow: /admin/imports classifications connector stages rows → admin approves →
-- promote upserts this table AND updates school_classifications (current snapshot).

CREATE TABLE IF NOT EXISTS public.school_classification_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL,
  classification text NOT NULL,
  region text,
  conference text,
  enrollment numeric,
  effective_year integer NOT NULL,
  cycle_label text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_name, effective_year)
);

CREATE INDEX IF NOT EXISTS school_classification_years_year_class_idx
  ON public.school_classification_years (effective_year, classification);

CREATE INDEX IF NOT EXISTS school_classification_years_school_idx
  ON public.school_classification_years (school_name);

ALTER TABLE public.school_classifications
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS conference text,
  ADD COLUMN IF NOT EXISTS enrollment numeric,
  ADD COLUMN IF NOT EXISTS effective_year integer;

COMMENT ON TABLE public.school_classification_years IS
  'Year-scoped NCHSAA school classification membership (reclassification history).';
COMMENT ON COLUMN public.school_classification_years.effective_year IS
  'Season/year these classes apply (e.g. 2026 for 2025-26 wrestling season / first year of cycle).';
