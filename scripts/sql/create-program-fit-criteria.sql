-- Program fit: one set of recruiting needs per college program (or per coach with no school).
-- Read and written only by the server (/api/coaches/program-fit, /api/compare); RLS on, no policies.
create table if not exists public.program_fit_criteria (
  id uuid primary key default gen_random_uuid(),
  school_id uuid unique,
  owner_user_id uuid unique,
  criteria jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_by_name text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint program_fit_criteria_scope check (school_id is not null or owner_user_id is not null)
);

alter table public.program_fit_criteria enable row level security;
revoke all on public.program_fit_criteria from anon, authenticated;
