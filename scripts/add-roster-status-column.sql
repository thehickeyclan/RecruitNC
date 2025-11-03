-- Add roster_status column to college_coach_stars table
-- This tracks whether a college athlete is currently active on the roster

ALTER TABLE college_coach_stars
ADD COLUMN IF NOT EXISTS roster_status TEXT DEFAULT 'Active';

COMMENT ON COLUMN college_coach_stars.roster_status IS 'Current roster status for college athletes: Active, Inactive, Transferred, Graduated, Medical Redshirt, etc.';

-- Create an index for faster queries on roster status
CREATE INDEX IF NOT EXISTS idx_college_coach_stars_roster_status 
ON college_coach_stars(roster_status);

-- Add a notes field for roster status details if it doesn't exist
ALTER TABLE college_coach_stars
ADD COLUMN IF NOT EXISTS roster_notes TEXT;

COMMENT ON COLUMN college_coach_stars.roster_notes IS 'Additional notes about roster status (e.g., "Transferred to UNC", "Medical redshirt - knee injury")';

