-- Add star rating system for recruits (1-5 stars)
-- This is separate from pipeline stage - it represents quality/fit/priority

DO $$ 
BEGIN
  -- Add star_rating column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'star_rating'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5);
    
    RAISE NOTICE 'Added star_rating column';
  ELSE
    RAISE NOTICE 'star_rating column already exists';
  END IF;
END $$;

-- Add index for filtering by star rating
CREATE INDEX IF NOT EXISTS idx_college_coach_stars_star_rating 
ON college_coach_stars(star_rating);

-- Add comment for documentation
COMMENT ON COLUMN college_coach_stars.star_rating IS 
'Recruit quality/fit rating (1-5 stars). 5 = dream recruit, 1 = low priority. Separate from pipeline_stage which tracks process.';

-- Verify the column was added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'college_coach_stars'
  AND column_name = 'star_rating';

