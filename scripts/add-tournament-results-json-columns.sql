-- Add JSON columns for tournament results (scalable, no new columns needed per year)

-- 1. Add new JSONB columns for tournament data
ALTER TABLE athletes 
ADD COLUMN IF NOT EXISTS nhsca_results JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS super32_results JSONB DEFAULT '[]'::jsonb;

-- 2. Add helpful comment
COMMENT ON COLUMN athletes.nhsca_results IS 'JSON array of NHSCA tournament results: [{year, placement, record, weight, division, notes}]';
COMMENT ON COLUMN athletes.super32_results IS 'JSON array of Super 32 tournament results: [{year, placement, record, weight, division, notes}]';

-- 3. Example: Migrate existing data for one athlete (Bentley Sly) as a test
-- This shows how to convert old columns to new JSON format
-- Run this for each athlete, then drop old columns once verified

-- Example structure for reference:
-- nhsca_results: [
--   {"year": 2025, "placement": "3rd", "record": "5-1", "weight": "157", "division": "Senior", "notes": ""},
--   {"year": 2024, "placement": "5th", "record": "4-2", "weight": "152", "division": "Junior", "notes": ""}
-- ]

-- You can verify the columns were added:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'athletes' 
AND column_name IN ('nhsca_results', 'super32_results');

