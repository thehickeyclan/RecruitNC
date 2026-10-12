-- Where a wrestler is competing next (Recruiting Portal, 12 Oct 2026).
--
-- The family enters it once; it fills the schedule line in "Email the coach" and, later, shows
-- approved college coaches which of their recruits are at which event.
--
-- This is a minor's future whereabouts. It is never public: server-only (RLS on, no policies,
-- browser roles revoked), written only by the wrestler's own account or a linked parent through
-- /api/college-list/schedule, and read only by them and by college coaches staff have approved.
--
-- Safe to run more than once.

create table if not exists public.athlete_upcoming_events (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  location text check (location is null or char_length(location) <= 120),
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (athlete_id, title, start_date)
);

create index if not exists athlete_upcoming_events_athlete_idx on public.athlete_upcoming_events (athlete_id, start_date);
create index if not exists athlete_upcoming_events_date_idx on public.athlete_upcoming_events (start_date);

alter table public.athlete_upcoming_events enable row level security;
revoke all on public.athlete_upcoming_events from anon, authenticated;
