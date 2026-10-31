-- South Carolina dual-meet bouts from SCMAT's scoreboards (29 Oct 2026).
--
-- ADMIN ONLY. SCMAT never renders publicly (Matt, 29 Oct 2026), so this table has row level
-- security on and NO select policy: the browser cannot read it and only the service role can.
-- It is a ranking and research input, not profile content — which is why these bouts are not in
-- other_tournament_bouts, the table every public profile reads.
--
-- One row per bout rather than per side: an admin looking at a head-to-head wants the bout, and
-- both wrestlers' ids are on it. The score column exists but is written null on purpose — a few
-- of SCMAT's Track-export lines carry the running team score or a reversed bout score, so the
-- result type is the only reliable part.
create table if not exists scmat_dual_bouts (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  source_page text,
  source_url text,
  context text,
  weight text,
  winner_name text not null,
  winner_school text,
  winner_athlete_id uuid references athletes (id) on delete set null,
  loser_name text not null,
  loser_school text,
  loser_athlete_id uuid references athletes (id) on delete set null,
  result_type text,
  score text,
  rw_log_status text,
  created_at timestamptz not null default now()
);
create index if not exists scmat_dual_bouts_winner_idx on scmat_dual_bouts (winner_athlete_id);
create index if not exists scmat_dual_bouts_loser_idx on scmat_dual_bouts (loser_athlete_id);
create index if not exists scmat_dual_bouts_season_idx on scmat_dual_bouts (season);

alter table scmat_dual_bouts enable row level security;
-- No policy on purpose. Anything that needs these rows reads them with the service role.
