-- "A college reached out" (Command Center, 16 Oct 2026).
--
-- Coaches find wrestlers on the platform and then call, text, visit and offer the way they always
-- have, off the platform, where nothing records it. Families tell us (Matt: "I am hearing stories
-- from families of calls, recruiting trips, etc. many"). This is where they log it in a tap: which
-- college, how, when. It feeds the family's college list and activity, and is the evidence that
-- coaches on the platform act on what they find.
--
-- school_id is the college map's id (lib/college-programs), not a foreign key: the program list is
-- a file, replaced each season. Server-only: RLS on, no policies, browser roles revoked; every read
-- and write goes through /api/college-contacts with the service role.
--
-- Safe to run more than once.

create table if not exists public.college_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  school_id text not null,
  kind text not null check (kind in ('call', 'text', 'email', 'social', 'letter', 'camp', 'visit', 'offer')),
  happened_on date not null default current_date,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists college_contacts_athlete_idx on public.college_contacts (athlete_id, happened_on desc);
create index if not exists college_contacts_user_idx on public.college_contacts (user_id, created_at desc);
create index if not exists college_contacts_school_idx on public.college_contacts (school_id);

alter table public.college_contacts enable row level security;
revoke all on public.college_contacts from anon, authenticated;
