-- Partner-club drop-ins taken by Blue members.
--
-- A coach at the partner club taps the member's card, which writes one row. The card reads the
-- most recent row to decide whether the free drop-in has refreshed; nothing else depends on it.
--
-- Deliberately append-only in normal use. A mis-tap at a busy door costs a family thirty days, so
-- an admin can delete a row to undo one, but the app never updates or removes them.

create table if not exists public.blue_drop_in_checkins (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  club_name text not null,
  checked_in_at timestamptz not null default now(),
  /** The account whose card was open — the member's own, not the coach's. */
  recorded_by_user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists blue_drop_in_checkins_athlete_idx
  on public.blue_drop_in_checkins (athlete_id, checked_in_at desc);

-- Who trained where is a minor's movement history. No policies are added, so anonymous and
-- signed-in clients get nothing; the API routes read it with the service role after checking the
-- card belongs to the account asking.
alter table public.blue_drop_in_checkins enable row level security;
