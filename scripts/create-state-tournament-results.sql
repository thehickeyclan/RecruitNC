-- Out-of-state high school state tournament results — run once in Supabase SQL Editor (safe to re-run).
-- NC stays in wrestling_nchsaa_results; these tables hold every other state.
--
-- state_tournament_divisions: one row per state bracket set (season × state × association × gender × class).
--   places_awarded says how deep the state places, so a missing 5th/6th reads as "not wrestled" only
--   when places_awarded < 5. Coverage is measured against it.
-- state_tournament_bouts: the placement bouts (finals, 3rd, 5th, 7th). The single store of truth.
-- state_tournament_placers: derived from bouts by scripts/import-state-tournament-results.py
--   (1st-bout winner = 1, loser = 2, ...), plus per-wrestler matching fields when collected.
--
-- Season 2026 = the 2025-26 school year (state tournament in February 2026).

create table if not exists public.state_tournament_divisions (
  id uuid primary key default gen_random_uuid(),
  season integer not null,
  state text not null check (state ~ '^[A-Z]{2}$'),
  association text not null,
  gender text not null check (gender in ('Boys', 'Girls')),
  classification text not null,
  class_rank integer,           -- 1 = largest enrollment class
  classes_in_state integer,
  brackets integer,
  places_awarded integer not null check (places_awarded between 1 and 8),
  tournament_dates text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season, state, association, gender, classification)
);

create table if not exists public.state_tournament_bouts (
  id uuid primary key default gen_random_uuid(),
  season integer not null,
  state text not null,
  association text not null,
  gender text not null,
  classification text not null,
  weight text not null,
  bout text not null check (bout in ('1st', '3rd', '5th', '7th')),
  winner_name text not null,
  winner_school text,
  loser_name text not null,
  loser_school text,
  result_type text check (result_type in ('F', 'TF', 'MD', 'DEC', 'SV', 'TB', 'UTB', 'INJ', 'DQ', 'FF')),
  score text,
  fall_time text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season, state, association, gender, classification, weight, bout),
  foreign key (season, state, association, gender, classification)
    references public.state_tournament_divisions (season, state, association, gender, classification)
    on delete cascade
);

create table if not exists public.state_tournament_placers (
  id uuid primary key default gen_random_uuid(),
  season integer not null,
  state text not null,
  association text not null,
  gender text not null,
  classification text not null,
  weight text not null,
  place integer not null check (place between 1 and 8),
  wrestler_name text not null,
  school_raw text,
  school_clean text,
  city text,
  grade text,
  grad_year integer,
  source_athlete_id text,
  source_athlete_id_source text,
  source_url text,
  -- Set by the import: some NC bout on file ties this name to this state (his school, or "VA").
  identity_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season, state, association, gender, classification, weight, place),
  foreign key (season, state, association, gender, classification)
    references public.state_tournament_divisions (season, state, association, gender, classification)
    on delete cascade
);

-- Added after the first run; safe on a table that already has it.
alter table public.state_tournament_placers add column if not exists identity_confirmed boolean not null default false;

create index if not exists idx_state_tournament_placers_name on public.state_tournament_placers (lower(wrestler_name));
create index if not exists idx_state_tournament_placers_state_season on public.state_tournament_placers (state, season);
create index if not exists idx_state_tournament_bouts_state_season on public.state_tournament_bouts (state, season);

alter table public.state_tournament_divisions enable row level security;
alter table public.state_tournament_bouts enable row level security;
alter table public.state_tournament_placers enable row level security;

drop policy if exists "state_tournament_divisions_public_read" on public.state_tournament_divisions;
create policy "state_tournament_divisions_public_read" on public.state_tournament_divisions
  for select to anon, authenticated using (true);

drop policy if exists "state_tournament_bouts_public_read" on public.state_tournament_bouts;
create policy "state_tournament_bouts_public_read" on public.state_tournament_bouts
  for select to anon, authenticated using (true);

drop policy if exists "state_tournament_placers_public_read" on public.state_tournament_placers;
create policy "state_tournament_placers_public_read" on public.state_tournament_placers
  for select to anon, authenticated using (true);

grant select on public.state_tournament_divisions, public.state_tournament_bouts, public.state_tournament_placers
  to anon, authenticated;
