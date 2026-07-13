-- Fargo Nationals results — run once in Supabase SQL Editor (safe to re-run).

create table if not exists public.fargo_results (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  athlete_name text not null,
  first_name text,
  last_name text,
  division text not null,
  weight_class text not null,
  wins integer not null default 0,
  losses integer not null default 0,
  record text,
  placement integer,
  is_all_american boolean not null default false,
  high_school text,
  notes text,
  event_name text not null default 'US Marine Corps National Championships (Fargo)',
  created_at timestamptz not null default now()
);

create index if not exists idx_fargo_results_athlete_name on public.fargo_results (athlete_name);
create index if not exists idx_fargo_results_year on public.fargo_results (year);
create index if not exists idx_fargo_results_high_school on public.fargo_results (high_school);
create index if not exists idx_fargo_results_year_division on public.fargo_results (year, division);

alter table public.fargo_results enable row level security;

drop policy if exists "fargo_results_public_read" on public.fargo_results;
create policy "fargo_results_public_read"
  on public.fargo_results
  for select
  to anon, authenticated
  using (true);
