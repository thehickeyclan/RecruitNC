-- Coach-confirmed recruiting needs (2 Nov 2026).
--
-- A college staff says which weights and class years it is recruiting. One row per program,
-- gender and college weight. The coach's matching list and the family's "Programs recruiting
-- your weight and class" both read it (lib/recruiting/needs-server.ts).
--
-- A need is dated by confirmed_at. "Still recruiting" moves it to now; after 90 days without
-- that it has expired and no family sees it. "Clear" sets cleared_at; a cleared row is kept
-- for the admin counts.
--
-- Server-only, like every coach table: RLS on, no policies, browser roles revoked. Written only
-- through /api/coach-portal/needs.
--
-- Safe to run more than once.

create table if not exists public.college_recruiting_needs (
  id uuid primary key default gen_random_uuid(),
  -- The staff's school (user_profiles.school_id). Null for a coach with no school record yet.
  school_id uuid references public.schools (id) on delete set null,
  program_name text not null check (char_length(program_name) between 2 and 160),
  -- The college map's id for the school (lib/college-programs/load.ts): division and campus.
  map_school_id text,
  posted_by uuid not null references auth.users (id) on delete cascade,
  gender text not null check (gender in ('Male', 'Female')),
  weight integer not null check (weight between 95 and 300),
  class_years integer[] not null check (cardinality(class_years) between 1 and 4),
  min_gpa numeric(3, 2) check (min_gpa is null or (min_gpa > 0 and min_gpa <= 5)),
  max_miles integer check (max_miles is null or max_miles between 50 and 5000),
  results_level text not null default 'any'
    check (results_level in ('any', 'state_placer', 'national_placer', 'nationally_ranked')),
  -- rw or ncu: which site it was posted from (event_data.site's values).
  site text check (site is null or site in ('rw', 'ncu', 'app')),
  confirmed_at timestamptz not null default now(),
  cleared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One open need per program, gender and weight.
create unique index if not exists college_recruiting_needs_one_open
  on public.college_recruiting_needs (coalesce(school_id::text, posted_by::text), gender, weight)
  where cleared_at is null;
create index if not exists college_recruiting_needs_open_idx
  on public.college_recruiting_needs (gender, weight, confirmed_at)
  where cleared_at is null;

alter table public.college_recruiting_needs enable row level security;
revoke all on public.college_recruiting_needs from anon, authenticated;

-- Check: should return 0 rows and no error.
select id, program_name, gender, weight, class_years, confirmed_at from public.college_recruiting_needs limit 5;
