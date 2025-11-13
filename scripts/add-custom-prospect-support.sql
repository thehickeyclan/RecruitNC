-- Add support for coaches to create custom prospects (out-of-state, unranked, etc.)
-- This allows coaches to track any athlete in their recruiting portal

-- Step 1: Add is_nc_athlete column to differentiate NC vs out-of-state athletes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athletes' AND column_name = 'is_nc_athlete'
  ) THEN
    ALTER TABLE athletes 
    ADD COLUMN is_nc_athlete BOOLEAN DEFAULT true;
    
    RAISE NOTICE 'Added is_nc_athlete column';
  ELSE
    RAISE NOTICE 'is_nc_athlete column already exists';
  END IF;
END $$;

-- Step 2: Add added_by_coach_id to track who created the prospect
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athletes' AND column_name = 'added_by_coach_id'
  ) THEN
    ALTER TABLE athletes 
    ADD COLUMN added_by_coach_id UUID REFERENCES user_profiles(user_id);
    
    RAISE NOTICE 'Added added_by_coach_id column';
  ELSE
    RAISE NOTICE 'added_by_coach_id column already exists';
  END IF;
END $$;

-- Step 3: Add state column if it doesn't exist (for filtering by state)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'athletes' AND column_name = 'state'
  ) THEN
    ALTER TABLE athletes 
    ADD COLUMN state VARCHAR(2);
    
    RAISE NOTICE 'Added state column';
  ELSE
    RAISE NOTICE 'state column already exists';
  END IF;
END $$;

-- Step 4: Mark all existing athletes as NC athletes
UPDATE athletes 
SET is_nc_athlete = true 
WHERE is_nc_athlete IS NULL;

-- Step 5: Set state to 'NC' for existing NC athletes (where we can infer it)
UPDATE athletes 
SET state = 'NC' 
WHERE state IS NULL 
  AND is_nc_athlete = true;

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS idx_athletes_is_nc_athlete 
ON athletes(is_nc_athlete);

CREATE INDEX IF NOT EXISTS idx_athletes_added_by_coach 
ON athletes(added_by_coach_id);

CREATE INDEX IF NOT EXISTS idx_athletes_state 
ON athletes(state);

-- Step 7: Verify the changes
SELECT 
  'Total Athletes' as metric,
  COUNT(*) as count
FROM athletes
UNION ALL
SELECT 
  'NC Athletes' as metric,
  COUNT(*) as count
FROM athletes
WHERE is_nc_athlete = true
UNION ALL
SELECT 
  'Custom/Out-of-State Athletes' as metric,
  COUNT(*) as count
FROM athletes
WHERE is_nc_athlete = false;

-- Step 8: Show column details
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'athletes'
  AND column_name IN ('is_nc_athlete', 'added_by_coach_id', 'state')
ORDER BY column_name;
