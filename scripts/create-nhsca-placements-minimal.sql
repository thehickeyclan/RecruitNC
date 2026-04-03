-- Minimal nhsca_placements for RecruitNC (bulk import + profile merge).
-- Run this FIRST if you get: ERROR 42P01 relation "nhsca_placements" does not exist
--
-- No FK to athletes — avoids failure on empty projects / missing public.athletes.

CREATE TABLE IF NOT EXISTS nhsca_placements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  tournament_name TEXT DEFAULT 'NHSCA National Championship',
  athlete_name TEXT NOT NULL,
  high_school TEXT,
  state TEXT DEFAULT 'NC',
  placement INTEGER,
  weight_class TEXT NOT NULL,
  division TEXT NOT NULL,
  record TEXT,
  athlete_id UUID,
  match_status TEXT DEFAULT 'unmatched',
  match_confidence NUMERIC(5, 2),
  match_method TEXT,
  notes TEXT,
  source TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  matched_at TIMESTAMPTZ,
  merged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nhsca_placements_year ON nhsca_placements(year);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_athlete_name ON nhsca_placements(athlete_name);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_division ON nhsca_placements(division);

CREATE INDEX IF NOT EXISTS idx_nhsca_placements_athlete_id ON nhsca_placements(athlete_id);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_match_status ON nhsca_placements(match_status);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_division_weight ON nhsca_placements(division, weight_class);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_placement ON nhsca_placements(placement);
