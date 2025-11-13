-- Add override fields to college_coach_stars for coach-specific athlete data
-- This allows coaches to maintain their own version of athlete information
-- especially for out-of-state athletes where official data may not exist

DO $$ 
BEGIN
  -- Contact Information Overrides
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_phone'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_phone TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_email'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_email TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_location'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_location TEXT;
  END IF;

  -- Academic Overrides
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_gpa'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_gpa NUMERIC(3,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_sat'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_sat INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_act'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_act INTEGER;
  END IF;

  -- Basic Info Overrides
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_weight'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_weight TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_highschool'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_highschool TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_graduation_year'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_graduation_year INTEGER;
  END IF;

  RAISE NOTICE 'Override columns added successfully';
END $$;

-- Add comments for documentation
COMMENT ON COLUMN college_coach_stars.override_phone IS 'Coach-specific phone number override';
COMMENT ON COLUMN college_coach_stars.override_email IS 'Coach-specific email override';
COMMENT ON COLUMN college_coach_stars.override_location IS 'Coach-specific location/state override';
COMMENT ON COLUMN college_coach_stars.override_gpa IS 'Coach-specific GPA override';
COMMENT ON COLUMN college_coach_stars.override_sat IS 'Coach-specific SAT score override';
COMMENT ON COLUMN college_coach_stars.override_act IS 'Coach-specific ACT score override';
COMMENT ON COLUMN college_coach_stars.override_weight IS 'Coach-specific weight class override';
COMMENT ON COLUMN college_coach_stars.override_highschool IS 'Coach-specific high school override';
COMMENT ON COLUMN college_coach_stars.override_graduation_year IS 'Coach-specific graduation year override';

-- Verify columns were added
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'college_coach_stars'
  AND column_name LIKE 'override_%'
ORDER BY column_name;
