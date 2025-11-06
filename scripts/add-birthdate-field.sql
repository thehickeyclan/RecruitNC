-- Add birthdate field to athletes and override in college_coach_stars

DO $$ 
BEGIN
  -- Add birthdate to athletes table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athletes' AND column_name = 'birthdate'
  ) THEN
    ALTER TABLE athletes 
    ADD COLUMN birthdate DATE;
    RAISE NOTICE 'Added birthdate column to athletes';
  ELSE
    RAISE NOTICE 'birthdate column already exists in athletes';
  END IF;

  -- Add override_birthdate to college_coach_stars
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'college_coach_stars' AND column_name = 'override_birthdate'
  ) THEN
    ALTER TABLE college_coach_stars 
    ADD COLUMN override_birthdate DATE;
    RAISE NOTICE 'Added override_birthdate column to college_coach_stars';
  ELSE
    RAISE NOTICE 'override_birthdate column already exists in college_coach_stars';
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN athletes.birthdate IS 'Athlete date of birth';
COMMENT ON COLUMN college_coach_stars.override_birthdate IS 'Coach-specific birthdate override';

-- Verify columns were added
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE (table_name = 'athletes' AND column_name = 'birthdate')
   OR (table_name = 'college_coach_stars' AND column_name = 'override_birthdate');

