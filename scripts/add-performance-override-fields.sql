-- Add performance/tournament override fields for manually tracked athletes
-- Allows coaches to add tournament data for out-of-state or manually created prospects

DO $$ 
BEGIN
  -- State Championships (for non-NC athletes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_state_championships'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_state_championships TEXT;
  END IF;

  -- NHSCA Results (freeform text)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_nhsca_results'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_nhsca_results TEXT;
  END IF;

  -- Super 32 Results (freeform text)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_super32_results'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_super32_results TEXT;
  END IF;

  -- College Opens Experience
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_college_opens'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_college_opens TEXT;
  END IF;

  -- Fargo Experience
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_fargo'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_fargo TEXT;
  END IF;

  -- Nationally Ranked Wins
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_ranked_wins'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_ranked_wins TEXT;
  END IF;

  -- Career Record
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_career_record'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_career_record TEXT;
  END IF;

  RAISE NOTICE 'Performance override columns added successfully';
END $$;

-- Add comments for documentation
COMMENT ON COLUMN college_coach_stars.override_state_championships IS 'Coach-specific state championship results for non-NC athletes';
COMMENT ON COLUMN college_coach_stars.override_nhsca_results IS 'Coach-specific NHSCA tournament results (freeform text)';
COMMENT ON COLUMN college_coach_stars.override_super32_results IS 'Coach-specific Super 32 tournament results (freeform text)';
COMMENT ON COLUMN college_coach_stars.override_college_opens IS 'Coach-specific college opens experience';
COMMENT ON COLUMN college_coach_stars.override_fargo IS 'Coach-specific Fargo nationals results';
COMMENT ON COLUMN college_coach_stars.override_ranked_wins IS 'Coach-specific nationally ranked wins';
COMMENT ON COLUMN college_coach_stars.override_career_record IS 'Coach-specific career record override';

-- Verify columns were added
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'college_coach_stars'
  AND column_name LIKE 'override_%'
ORDER BY column_name;

