-- Add lead source tracking fields to college coach stars table

ALTER TABLE college_coach_stars
ADD COLUMN IF NOT EXISTS lead_source TEXT;

ALTER TABLE college_coach_stars
ADD COLUMN IF NOT EXISTS lead_subsource TEXT;

ALTER TABLE college_coach_stars
ADD COLUMN IF NOT EXISTS lead_source_detail TEXT;

-- Ensure updated_at exists for audit purposes
ALTER TABLE college_coach_stars
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

