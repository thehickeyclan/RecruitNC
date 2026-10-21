-- A wrestler's family telling a college program "we're interested" (Matt, 21 Oct 2026).
--
-- The family chooses it, college by college, from the Command Center's college list; saving a
-- college to the list stays private. The program's approved coaches see it on Coach Home.
-- Server-only like the college list: RLS on, no policies, browser roles revoked; written only
-- through /api/college-list/interest by the wrestler's own account or a linked parent.
--
-- Safe to run more than once.

create table if not exists public.college_interest (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  -- The college map's id (programs-2026-27.json), the same key the college list uses.
  school_id text not null,
  sent_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (athlete_id, school_id)
);

create index if not exists college_interest_school_idx on public.college_interest (school_id, created_at desc);

alter table public.college_interest enable row level security;
revoke all on public.college_interest from anon, authenticated;
