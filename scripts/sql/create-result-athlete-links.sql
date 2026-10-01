-- Wrestler identity, step 1. Additive only: one new table, no existing table touched.
create table if not exists public.result_athlete_links (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id uuid not null,
  athlete_id uuid references public.athletes(id) on delete cascade,
  status text not null check (status in ('linked', 'review', 'rejected')),
  method text not null,
  score integer,
  reason text,
  candidates jsonb,
  matcher_version text not null,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_table, source_id)
);
create index if not exists result_athlete_links_athlete_idx on public.result_athlete_links (athlete_id) where status = 'linked';
create index if not exists result_athlete_links_status_idx on public.result_athlete_links (source_table, status);
alter table public.result_athlete_links enable row level security;
