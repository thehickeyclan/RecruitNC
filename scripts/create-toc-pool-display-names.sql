-- The name an entrant chooses for the bracket pool leaderboard.
--
-- Optional. Without a row here an entrant appears as a first name and a last initial, which is
-- what the board did for everyone before — so nobody has to do anything, and anybody who would
-- rather not have part of a child's real name on the board has a way out.
--
-- display_name_key is the lower-cased, single-spaced form. The unique index on it is what
-- actually stops two people taking one name; the check in the route is only a friendlier error.

create table if not exists public.toc_pool_display_names (
  user_id uuid primary key,
  display_name text not null,
  display_name_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists toc_pool_display_names_key_idx
  on public.toc_pool_display_names (display_name_key);

-- No policies: the routes use the service role, and a table mapping a chosen name to a user id is
-- not something to leave readable.
alter table public.toc_pool_display_names enable row level security;
