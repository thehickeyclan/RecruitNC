-- NHSCA Duals 2026 — live results tracker (National + Select teams)
-- Run in Supabase SQL Editor. Then STEP-2 RLS, then STEP-3 seed.

create table if not exists public.nhsca_duals_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_type text not null check (team_type in ('national', 'select', 'opponent')),
  event_key text not null default 'nhsca-duals-2026',
  created_at timestamptz not null default now()
);

create unique index if not exists nhsca_duals_teams_event_type_uq
  on public.nhsca_duals_teams (event_key, team_type)
  where team_type in ('national', 'select');

create table if not exists public.nhsca_duals_wrestlers (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.nhsca_duals_teams (id) on delete cascade,
  name text not null,
  weight_class text not null,
  display_weight text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.nhsca_duals_event_days (
  id uuid primary key default gen_random_uuid(),
  event_key text not null default 'nhsca-duals-2026',
  name text not null,
  event_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.nhsca_duals_pools (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.nhsca_duals_event_days (id) on delete cascade,
  team_id uuid not null references public.nhsca_duals_teams (id) on delete cascade,
  pool_number int not null,
  created_at timestamptz not null default now(),
  unique (day_id, team_id, pool_number)
);

create table if not exists public.nhsca_duals_duals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.nhsca_duals_teams (id) on delete cascade,
  day_id uuid not null references public.nhsca_duals_event_days (id) on delete cascade,
  pool_id uuid not null references public.nhsca_duals_pools (id) on delete cascade,
  round_name text not null,
  opponent_team_name text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'final')),
  nc_score int not null default 0,
  opponent_score int not null default 0,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nhsca_duals_matches (
  id uuid primary key default gen_random_uuid(),
  dual_id uuid not null references public.nhsca_duals_duals (id) on delete cascade,
  weight text not null,
  nc_wrestler_id uuid references public.nhsca_duals_wrestlers (id) on delete set null,
  opponent_wrestler_name text not null default '',
  winner text check (winner in ('nc', 'opponent', 'draw', 'no_match')),
  result_type text,
  nc_points int not null default 0,
  opponent_points int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dual_id, weight)
);

create index if not exists nhsca_duals_duals_team_day_idx on public.nhsca_duals_duals (team_id, day_id);
create index if not exists nhsca_duals_matches_dual_idx on public.nhsca_duals_matches (dual_id);
