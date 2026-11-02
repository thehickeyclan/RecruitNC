-- College commitments from FloWrestling's running lists (25 Oct 2026).
--
-- Four tables, because the job has four jobs: hold the snapshot it compares against, keep the
-- history of what each wrestler's commitment has been, keep the rows it refused to apply, and
-- say what each run did.
--
-- Nothing here replaces athletes.college, which stays the current value every surface already
-- reads. These tables are what that value cannot carry: where it came from, when, and what it
-- was before.

-- 1. The snapshot. One row per wrestler per Flo list, as the list last read.
create table if not exists flo_commitment_rows (
  id uuid primary key default gen_random_uuid(),
  list_article_id text not null,
  wrestler_key text not null,
  wrestler_name text not null,
  college text not null,
  division_label text,
  big_board_rank int,
  high_school text,
  state text,
  weight text,
  class_year int not null,
  gender text not null check (gender in ('Male', 'Female')),
  source_url text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (wrestler_key)
);
create index if not exists flo_commitment_rows_list_idx on flo_commitment_rows (list_article_id);
create index if not exists flo_commitment_rows_state_idx on flo_commitment_rows (state, class_year);

-- 2. The history. Append-only: a row per thing that happened to a wrestler's commitment.
--    `status` is 'reported' for everything Flo publishes. The NLI is gone, so nothing is called
--    signed unless a program announcement says the written offer of aid exists; that is a
--    different source and will be a different status.
create table if not exists athlete_commitment_history (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references athletes (id) on delete cascade,
  wrestler_name text not null,
  college text,
  previous_college text,
  status text not null default 'reported' check (status in ('reported', 'signed', 'withdrawn')),
  change text not null check (change in ('added', 'flipped', 'removed', 'corrected')),
  class_year int,
  gender text,
  reported_date date,
  source text not null,
  source_url text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists athlete_commitment_history_athlete_idx on athlete_commitment_history (athlete_id, created_at desc);

-- 3. The held queue. A row the job would not apply, with the reason, so nothing is guessed and
--    nothing is silently dropped. `resolved_at` is set when a person settles it.
create table if not exists flo_commitment_holds (
  id uuid primary key default gen_random_uuid(),
  wrestler_key text not null,
  wrestler_name text not null,
  college text not null,
  class_year int not null,
  gender text not null,
  high_school text,
  state text,
  reason text not null,
  detail text,
  source_url text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_note text,
  unique (wrestler_key)
);
create index if not exists flo_commitment_holds_open_idx on flo_commitment_holds (resolved_at, reason);

-- 4. The run log. Source, retrieval time, coverage and totals, as the job reports them.
create table if not exists flo_commitment_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  dry_run boolean not null default false,
  lists jsonb not null default '[]'::jsonb,
  rows_read int not null default 0,
  added int not null default 0,
  flipped int not null default 0,
  removed int not null default 0,
  corrected int not null default 0,
  applied int not null default 0,
  held int not null default 0,
  error text
);

alter table flo_commitment_rows enable row level security;
alter table athlete_commitment_history enable row level security;
alter table flo_commitment_holds enable row level security;
alter table flo_commitment_runs enable row level security;

-- The job writes with the service role, which bypasses RLS. Commitment history is public the way
-- the commitment itself is; the snapshot, the held queue and the run log are operational and stay
-- closed to the browser.
drop policy if exists "commitment history is public" on athlete_commitment_history;
create policy "commitment history is public" on athlete_commitment_history for select using (true);
