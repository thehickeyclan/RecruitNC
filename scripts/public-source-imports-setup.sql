-- Public source imports (stage → admin review → promote)
-- Run in Supabase SQL Editor before using /admin/imports.
--
-- Datasets (dataset_key):
--   nchsaa_dual_team_champions
--   nchsaa_individual_placers
--
-- Flow: connector stages rows → admin approves on /admin/imports → promote into
-- dual_team_champions / wrestling_nchsaa_results. Never auto-publish scrapes.

CREATE TABLE IF NOT EXISTS public.public_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_key text NOT NULL,
  source_label text,
  source_url text,
  year integer,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'partial', 'approved', 'rejected')),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  reviewed_at timestamptz,
  reviewed_by uuid
);

CREATE INDEX IF NOT EXISTS public_import_batches_dataset_created_idx
  ON public.public_import_batches (dataset_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.public_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.public_import_batches (id) ON DELETE CASCADE,
  dataset_key text NOT NULL,
  natural_key text NOT NULL,
  diff_status text NOT NULL
    CHECK (diff_status IN ('new', 'match', 'changed', 'conflict')),
  proposed jsonb NOT NULL,
  existing jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  promote_error text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_import_rows_batch_status_idx
  ON public.public_import_rows (batch_id, status);

CREATE INDEX IF NOT EXISTS public_import_rows_dataset_status_idx
  ON public.public_import_rows (dataset_key, status);

ALTER TABLE public.public_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_import_rows ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: only service-role (admin API) reads/writes.

COMMENT ON TABLE public.public_import_batches IS
  'Staged official public-source import batches for admin review before promote.';
COMMENT ON TABLE public.public_import_rows IS
  'Per-row proposed payload + diff vs RecruitNC production tables.';
