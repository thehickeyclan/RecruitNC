-- =============================================================================
-- Extend nhsca_placements with live-roster / full-result fields (NHSCA 2026+).
-- Run once in Supabase SQL Editor. Safe to re-run: uses IF NOT EXISTS.
--
-- Pairs with: sync-all-nhsca-roster-into-placements-2026-nc.sql (updated INSERT)
-- =============================================================================

ALTER TABLE nhsca_placements ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE nhsca_placements ADD COLUMN IF NOT EXISTS wins INTEGER;
ALTER TABLE nhsca_placements ADD COLUMN IF NOT EXISTS losses INTEGER;
ALTER TABLE nhsca_placements ADD COLUMN IF NOT EXISTS seed INTEGER;
ALTER TABLE nhsca_placements ADD COLUMN IF NOT EXISTS bracket_status TEXT;
ALTER TABLE nhsca_placements ADD COLUMN IF NOT EXISTS bracket_side TEXT;
ALTER TABLE nhsca_placements ADD COLUMN IF NOT EXISTS current_round TEXT;
ALTER TABLE nhsca_placements ADD COLUMN IF NOT EXISTS seeded_wins INTEGER;
ALTER TABLE nhsca_placements ADD COLUMN IF NOT EXISTS seeded_losses INTEGER;
ALTER TABLE nhsca_placements ADD COLUMN IF NOT EXISTS furthest_consi_round TEXT;
ALTER TABLE nhsca_placements ADD COLUMN IF NOT EXISTS notable_wins TEXT;
ALTER TABLE nhsca_placements ADD COLUMN IF NOT EXISTS notable_win_count INTEGER;
ALTER TABLE nhsca_placements ADD COLUMN IF NOT EXISTS nhsca_roster_id UUID;

COMMENT ON COLUMN nhsca_placements.gender IS 'NHSCA roster: Male/Female';
COMMENT ON COLUMN nhsca_placements.wins IS 'Tournament wins (from live roster or import)';
COMMENT ON COLUMN nhsca_placements.losses IS 'Tournament losses';
COMMENT ON COLUMN nhsca_placements.seed IS 'Bracket seed when present';
COMMENT ON COLUMN nhsca_placements.bracket_status IS 'e.g. Active, eliminated';
COMMENT ON COLUMN nhsca_placements.bracket_side IS 'e.g. championship';
COMMENT ON COLUMN nhsca_placements.current_round IS 'Live bracket progress';
COMMENT ON COLUMN nhsca_placements.seeded_wins IS 'Wins vs seeded opponents';
COMMENT ON COLUMN nhsca_placements.seeded_losses IS 'Losses vs seeded opponents';
COMMENT ON COLUMN nhsca_placements.furthest_consi_round IS 'e.g. Consi32, Consi8';
COMMENT ON COLUMN nhsca_placements.notable_wins IS 'Optional text from dashboard';
COMMENT ON COLUMN nhsca_placements.notable_win_count IS 'Count of notable wins';
COMMENT ON COLUMN nhsca_placements.nhsca_roster_id IS 'Source row id in nhsca_roster when synced from live table';
