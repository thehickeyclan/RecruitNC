-- =============================================================================
-- Create nhsca_roster (live NHSCA dashboard) if missing — fixes 42P01 on sync.
-- Run in Supabase SQL Editor once. Then load rows (dashboard, CSV import, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS nhsca_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  weight_class TEXT,
  gender TEXT,
  classification TEXT,
  school TEXT,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  seed INTEGER,
  placement INTEGER,
  bracket_status TEXT,
  notable_wins TEXT,
  notable_win_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  bracket_side TEXT,
  current_round TEXT,
  seeded_wins INTEGER DEFAULT 0,
  seeded_losses INTEGER DEFAULT 0,
  furthest_consi_round TEXT
);

CREATE INDEX IF NOT EXISTS idx_nhsca_roster_name ON nhsca_roster (name);
CREATE INDEX IF NOT EXISTS idx_nhsca_roster_classification ON nhsca_roster (classification);

COMMENT ON TABLE nhsca_roster IS 'NHSCA live event roster; sync to nhsca_placements via sync-all-nhsca-roster-into-placements-2026-nc.sql';
