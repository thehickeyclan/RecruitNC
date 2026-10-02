-- Following an athlete, and the per-event result digest that follows from it.
--
-- `college_coach_stars` already records which athletes a college coach is tracking, but it is a
-- recruiting CRM: sixty-odd columns of offers, visits, aid and NLI dates, with coach-scoped
-- access. A notification subscription does not belong there, and parents and high school coaches
-- want the same thing. So follows get their own table, and starring creates one.

create table if not exists athlete_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  /* Where the follow came from, so a star-derived follow can be told from a deliberate one. */
  source text not null default 'app',
  created_at timestamptz not null default now(),
  unique (user_id, athlete_id)
);

create index if not exists athlete_follows_user_idx on athlete_follows (user_id);
create index if not exists athlete_follows_athlete_idx on athlete_follows (athlete_id);

alter table athlete_follows enable row level security;

drop policy if exists "own follows readable" on athlete_follows;
create policy "own follows readable" on athlete_follows
  for select using (auth.uid() = user_id);

drop policy if exists "own follows writable" on athlete_follows;
create policy "own follows writable" on athlete_follows
  for insert with check (auth.uid() = user_id);

drop policy if exists "own follows removable" on athlete_follows;
create policy "own follows removable" on athlete_follows
  for delete using (auth.uid() = user_id);

-- Every coach already starring somebody starts out following them, so the digest has an
-- audience on day one instead of waiting for 16 coaches to tap a new button.
insert into athlete_follows (user_id, athlete_id, source)
select coach_user_id, athlete_id, 'star'
from college_coach_stars
where coach_user_id is not null
  and athlete_id is not null
on conflict (user_id, athlete_id) do nothing;

-- The notification preference. Defaults on: a result digest only ever concerns a wrestler this
-- account chose to follow, so it is never unsolicited.
alter table push_devices add column if not exists alert_results boolean not null default true;

-- One digest per account per event, ever.
--
-- Results arrive by import, in bursts. Without this a Journeymen upload would alert the same
-- coach once per row, and a re-import would alert them all over again.
create table if not exists push_sent_result_digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  /* Stable per event: other_tournament_results.event_key, or "<source>-<year>". */
  event_key text not null,
  event_label text,
  athletes_followed int not null default 0,
  recipients int not null default 0,
  sent_at timestamptz not null default now(),
  unique (user_id, event_key)
);

create index if not exists push_sent_result_digests_event_idx on push_sent_result_digests (event_key);
