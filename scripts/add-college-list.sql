-- My College List (Recruiting Portal, 12 Oct 2026).
--
-- A Blue family saves schools from the college map and tracks where they stand with each:
-- interested, questionnaire done, contacted, talking, visited, offer.
--
-- One row per account per school. school_id is the map's school id (lib/college-programs), not a
-- foreign key: the program list is a file, replaced each season.
--
-- Server-only, like coach_threads: RLS on, no policies, browser roles revoked. Every read and
-- write goes through /api/college-list with the service role.
--
-- Safe to run more than once.

create table if not exists public.college_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  school_id text not null,
  status text not null default 'interested'
    check (status in ('interested', 'questionnaire', 'contacted', 'talking', 'visited', 'offer')),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, school_id)
);

create index if not exists college_list_items_user_idx on public.college_list_items (user_id, updated_at desc);

alter table public.college_list_items enable row level security;
revoke all on public.college_list_items from anon, authenticated;
