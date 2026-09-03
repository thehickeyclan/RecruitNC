-- Partner-club drop-ins taken by Blue members.
--
-- A coach at the partner club taps the member's card, which writes one row. The card reads the
-- most recent row *for that club* to decide whether its free session has refreshed: the offer
-- belongs to each club, so a visit to one never spends the first visit owed at another.
--
-- Deliberately append-only in normal use. A mis-tap at a busy door costs a family thirty days, so
-- an admin can delete a row to undo one, but the app never updates or removes them.

create table if not exists public.blue_drop_in_checkins (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  /** The partner club's stable id from lib/blue/partner-clubs.ts. The window is counted per club. */
  club_id text not null,
  /** What the club was called when the visit happened, for reading a log back later. */
  club_name text not null,
  checked_in_at timestamptz not null default now(),
  /** The account whose card was open — the member's own, not the coach's. */
  recorded_by_user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists blue_drop_in_checkins_athlete_club_idx
  on public.blue_drop_in_checkins (athlete_id, club_id, checked_in_at desc);

-- Who trained where is a minor's movement history. No policies are added, so anonymous and
-- signed-in clients get nothing; the API routes read it with the service role after checking the
-- card belongs to the account asking.
alter table public.blue_drop_in_checkins enable row level security;
