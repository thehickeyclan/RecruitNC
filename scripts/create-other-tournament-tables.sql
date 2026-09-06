-- Other Tournaments: qualifiers and open events that are NOT Super 32 itself.
--
-- Super 32 Early Entry (a.k.a. the Super 32 Qualifier) is a SEPARATE tournament from
-- Super 32. Top 4 at each weight earn a chance to enter Super 32 when registration opens.
-- These rows must never be merged into `super32_results`.
--
-- Two tables, mirroring the fargo_results / fargo_bouts pair:
--   other_tournament_results — one row per athlete per event (record, placement)
--   other_tournament_bouts   — one row per athlete per bout (direct wins, head-to-head, TOC seeding)

CREATE TABLE IF NOT EXISTS other_tournament_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key           text NOT NULL,          -- 'super32-early-entry-nc-2026'
  event_name          text NOT NULL,          -- 'NC Super 32 Early Entry'
  event_short_name    text,                   -- 'Super 32 Early Entry'
  event_state         text,                   -- state the event was HELD in (not the athlete's)
  event_date          date,
  year                integer NOT NULL,
  athlete_name        text NOT NULL,
  athlete_id          uuid REFERENCES athletes(id) ON DELETE SET NULL,
  club                text,                   -- team as printed in the source (club OR high school)
  high_school         text,                   -- RESOLVED from our athletes table only — never the source's club/city
  state               text,                   -- athlete's state, when known
  gender              text,
  weight_class        text NOT NULL,
  wins                integer NOT NULL DEFAULT 0,
  losses              integer NOT NULL DEFAULT 0,
  byes                integer NOT NULL DEFAULT 0,
  record              text,
  placement           integer,                -- 1-4; NULL = competed but did not place
  qualified           boolean NOT NULL DEFAULT false,  -- top 4 = eligible to enter Super 32
  entrants            integer,                -- field size at that weight, for context
  source_file         text,
  verification_status text NOT NULL DEFAULT 'verified',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_key, athlete_name, weight_class, club)
);

CREATE INDEX IF NOT EXISTS other_tournament_results_athlete_id_idx ON other_tournament_results (athlete_id);
CREATE INDEX IF NOT EXISTS other_tournament_results_event_idx      ON other_tournament_results (event_key, weight_class);
CREATE INDEX IF NOT EXISTS other_tournament_results_name_idx       ON other_tournament_results (lower(athlete_name));

CREATE TABLE IF NOT EXISTS other_tournament_bouts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key      text NOT NULL,
  event_name     text NOT NULL,
  year           integer NOT NULL,
  weight_class   text NOT NULL,
  round          text,
  bout_order     integer,                -- bracket progression order, low = early round
  athlete_name   text NOT NULL,
  athlete_id     uuid REFERENCES athletes(id) ON DELETE SET NULL,
  athlete_club   text,
  opponent_name  text,
  opponent_id    uuid REFERENCES athletes(id) ON DELETE SET NULL,
  opponent_club  text,
  win            boolean,
  is_bye         boolean NOT NULL DEFAULT false,
  win_type       text,                   -- DEC / MD / TF / F / FOR / M FOR / DQ / DEF / BYE
  score          text,
  source_file    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_key, weight_class, round, athlete_name, opponent_name)
);

CREATE INDEX IF NOT EXISTS other_tournament_bouts_athlete_id_idx ON other_tournament_bouts (athlete_id);
CREATE INDEX IF NOT EXISTS other_tournament_bouts_event_idx      ON other_tournament_bouts (event_key, weight_class);
CREATE INDEX IF NOT EXISTS other_tournament_bouts_name_idx       ON other_tournament_bouts (lower(athlete_name));
CREATE INDEX IF NOT EXISTS other_tournament_bouts_opponent_idx   ON other_tournament_bouts (lower(opponent_name));

COMMENT ON TABLE other_tournament_results IS 'Athlete-level results for qualifiers/open events shown in the profile "Other Tournaments" section. Distinct from super32_results — Super 32 Early Entry is a different tournament from Super 32.';
COMMENT ON TABLE other_tournament_bouts IS 'Bout-level results (one row per athlete per bout) powering direct wins, head-to-head, and TOC seeding.';
COMMENT ON COLUMN other_tournament_results.high_school IS 'Resolved from our athletes table. Never write the source club/city here.';

-- RLS: public read, writes only through the service role (mirrors fargo_results / fargo_bouts).
ALTER TABLE other_tournament_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_tournament_bouts   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS other_tournament_results_public_read ON other_tournament_results;
CREATE POLICY other_tournament_results_public_read ON other_tournament_results
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS other_tournament_bouts_public_read ON other_tournament_bouts;
CREATE POLICY other_tournament_bouts_public_read ON other_tournament_bouts
  FOR SELECT TO anon, authenticated USING (true);

-- Bracket vocabularies differ by leg ("Finals" in NC, "1st Place Match" in VA). `round` holds
-- the canonical name so profiles read consistently; `source_round` keeps the printed label.
ALTER TABLE other_tournament_bouts ADD COLUMN IF NOT EXISTS source_round text;
