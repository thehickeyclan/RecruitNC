-- Create NHSCA Placements table for bulk import and matching
-- This table stores all NHSCA placements before they're matched to athlete profiles

CREATE TABLE IF NOT EXISTS nhsca_placements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Tournament Information
  year INTEGER NOT NULL,
  tournament_name TEXT DEFAULT 'NHSCA National Championship',
  
  -- Athlete Information (from import)
  athlete_name TEXT NOT NULL,
  high_school TEXT,
  state TEXT DEFAULT 'NC',
  
  -- Placement Details
  placement INTEGER, -- 1, 2, 3, 4, 5, 6, 7, 8 (NULL for participants who didn't place)
  weight_class TEXT NOT NULL,
  division TEXT NOT NULL, -- Freshman, Sophomore, Junior, Senior
  record TEXT, -- e.g., "5-1", "6-0"
  
  -- Matching Status
  athlete_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
  match_status TEXT DEFAULT 'unmatched', -- 'unmatched', 'auto_matched', 'manually_matched', 'merged'
  match_confidence DECIMAL(3,2), -- 0.00 to 1.00
  match_method TEXT, -- 'exact_name', 'name_school', 'name_weight', 'manual'
  
  -- Metadata
  notes TEXT,
  source TEXT DEFAULT 'bulk_import_2025',
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  matched_at TIMESTAMP WITH TIME ZONE,
  merged_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_year ON nhsca_placements(year);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_athlete_name ON nhsca_placements(athlete_name);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_athlete_id ON nhsca_placements(athlete_id);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_match_status ON nhsca_placements(match_status);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_division_weight ON nhsca_placements(division, weight_class);
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_placement ON nhsca_placements(placement);

-- Full text search index for name matching (requires pg_trgm extension)
-- Enable the extension first
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Then create the index
CREATE INDEX IF NOT EXISTS idx_nhsca_placements_name_trgm ON nhsca_placements USING gin(athlete_name gin_trgm_ops);

-- Add helpful comments
COMMENT ON TABLE nhsca_placements IS 'Bulk NHSCA tournament placements - used for import, matching, and merging into athlete profiles';
COMMENT ON COLUMN nhsca_placements.match_status IS 'unmatched: not yet linked, auto_matched: automatically matched, manually_matched: admin matched, merged: data merged into athlete profile';
COMMENT ON COLUMN nhsca_placements.match_confidence IS 'Confidence score 0.00-1.00 for automatic matching';
COMMENT ON COLUMN nhsca_placements.match_method IS 'How the match was made: exact_name, name_school, name_weight, manual';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_nhsca_placements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS trigger_update_nhsca_placements_updated_at ON nhsca_placements;

CREATE TRIGGER trigger_update_nhsca_placements_updated_at
  BEFORE UPDATE ON nhsca_placements
  FOR EACH ROW
  EXECUTE FUNCTION update_nhsca_placements_updated_at();

