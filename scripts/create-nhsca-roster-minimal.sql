-- Minimal nhsca_roster for RecruitNC live dashboard + profile merge (lib/tournament-tables.ts).
-- Run in Supabase SQL Editor if you get: ERROR 42P01 relation "nhsca_roster" does not exist
--
-- Optional later: tournament_year (or nhsca_year / year) for multi-season rows; code defaults missing year to 2026.

CREATE TABLE IF NOT EXISTS nhsca_roster (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  weight_class TEXT NOT NULL DEFAULT '',
  classification TEXT NOT NULL DEFAULT 'Senior',
  school TEXT DEFAULT '',
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  seed INTEGER,
  placement INTEGER,
  bracket_status TEXT DEFAULT 'active',
  bracket_side TEXT,
  current_round TEXT,
  furthest_consi_round TEXT,
  seeded_wins INTEGER,
  seeded_losses INTEGER,
  tournament_year INTEGER,
  nhsca_year INTEGER,
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nhsca_roster_name ON nhsca_roster(name);
CREATE INDEX IF NOT EXISTS idx_nhsca_roster_classification ON nhsca_roster(classification);
CREATE INDEX IF NOT EXISTS idx_nhsca_roster_tournament_year ON nhsca_roster(tournament_year);
