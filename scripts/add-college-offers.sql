-- "What will it cost us?" (30 Oct 2026): what a college offered, as the family typed it from the
-- offer letter, so the Command Center can show what they will owe (lib/recruiting/offers.ts).
--
-- Yearly dollar figures only: grants, merit or academic aid, athletic scholarship, other aid and
-- loans, plus the cost of attendance when the letter gives one, how many years it covers and
-- whether it renews. Nothing about the family's income or finances is ever stored.
--
-- One row per wrestler per college. school_id is the college map's id (lib/college-programs), not a
-- foreign key, as in recruiting_visits. Server-only: RLS on, no policies, browser roles revoked;
-- every read and write goes through /api/college-offers with the service role.
--
-- Safe to run more than once.

create table if not exists public.college_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  school_id text not null,
  cost_of_attendance integer check (cost_of_attendance is null or cost_of_attendance between 0 and 200000),
  grants integer not null default 0 check (grants between 0 and 200000),
  merit integer not null default 0 check (merit between 0 and 200000),
  athletic integer not null default 0 check (athletic between 0 and 200000),
  revenue_share integer not null default 0 check (revenue_share between 0 and 200000),
  other_aid integer not null default 0 check (other_aid between 0 and 200000),
  loans integer not null default 0 check (loans between 0 and 200000),
  years smallint not null default 4 check (years between 1 and 4),
  renews text not null default 'unknown' check (renews in ('yes', 'no', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, school_id)
);

create index if not exists college_offers_user_idx on public.college_offers (user_id);

-- Revenue share or NIL in a written agreement with the college (added 30 Oct 2026, after the first run).
alter table public.college_offers add column if not exists revenue_share integer not null default 0 check (revenue_share between 0 and 200000);

alter table public.college_offers enable row level security;
revoke all on public.college_offers from anon, authenticated;
