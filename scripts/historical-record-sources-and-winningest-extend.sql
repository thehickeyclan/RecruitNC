-- Historical record sources + extend winningest_wrestlers for NCHSAA single-season most victories.
-- Run in Supabase SQL Editor once. Service role writes; anon/authenticated may SELECT.

-- ---------------------------------------------------------------------------
-- 1) Source registry (reusable for future historical datasets)
-- ---------------------------------------------------------------------------
create table if not exists public.historical_record_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  title text not null,
  dataset_key text not null,
  version integer not null default 1,
  source_type text not null default 'nchsaa_record_book',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint historical_record_sources_dataset_version_uq unique (dataset_key, version)
);

create index if not exists idx_historical_record_sources_source_key
  on public.historical_record_sources (source_key);

alter table public.historical_record_sources enable row level security;

drop policy if exists "historical_record_sources_select_public" on public.historical_record_sources;
create policy "historical_record_sources_select_public"
  on public.historical_record_sources
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 2) Ensure winningest_wrestlers exists (legacy shape) then extend
-- ---------------------------------------------------------------------------
create table if not exists public.winningest_wrestlers (
  id serial primary key,
  rank_position varchar(10) not null,
  rank_numeric integer not null,
  is_tied boolean default false,
  wrestler_name varchar(255) not null,
  school varchar(255) not null,
  record varchar(20) not null,
  wins integer not null,
  losses integer not null,
  year varchar(20) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.winningest_wrestlers
  add column if not exists source_id uuid references public.historical_record_sources(id) on delete set null,
  add column if not exists source_record_id text,
  add column if not exists season_start_year integer,
  add column if not exists season_end_year integer,
  add column if not exists athlete_id uuid,
  add column if not exists school_id uuid,
  add column if not exists match_status text not null default 'unmatched',
  add column if not exists match_confidence numeric,
  add column if not exists match_reasons jsonb not null default '[]'::jsonb,
  add column if not exists source_payload jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'winningest_wrestlers_match_status_check'
  ) then
    alter table public.winningest_wrestlers
      add constraint winningest_wrestlers_match_status_check
      check (match_status in (
        'matched', 'unmatched', 'needs_review', 'manually_confirmed', 'manually_rejected'
      ));
  end if;
end $$;

-- Full UNIQUE so PostgREST upsert ON CONFLICT (source_id, source_record_id) works.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'winningest_wrestlers_source_record_key'
  ) then
    alter table public.winningest_wrestlers
      add constraint winningest_wrestlers_source_record_key unique (source_id, source_record_id);
  end if;
end $$;

create index if not exists idx_winningest_wrestlers_match_status
  on public.winningest_wrestlers (match_status);

create index if not exists idx_winningest_wrestlers_athlete_id
  on public.winningest_wrestlers (athlete_id)
  where athlete_id is not null;

create index if not exists idx_winningest_wrestlers_school_id
  on public.winningest_wrestlers (school_id)
  where school_id is not null;

create index if not exists idx_winningest_wrestlers_season_start
  on public.winningest_wrestlers (season_start_year);

alter table public.winningest_wrestlers enable row level security;

drop policy if exists "winningest_wrestlers_select_public" on public.winningest_wrestlers;
create policy "winningest_wrestlers_select_public"
  on public.winningest_wrestlers
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 3) Rollback helper for this exact dataset + version (safe — no athletes/schools)
-- ---------------------------------------------------------------------------
-- delete from public.winningest_wrestlers w
-- using public.historical_record_sources s
-- where w.source_id = s.id
--   and s.dataset_key = 'nc_wrestling_most_victories_single_season'
--   and s.version = 1;
-- delete from public.historical_record_sources
-- where dataset_key = 'nc_wrestling_most_victories_single_season'
--   and version = 1;

notify pgrst, 'reload schema';
