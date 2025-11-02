-- Fix admin school assignment issue
-- Admins should NOT have school_id set - they should be able to view all schools
-- This script resets admin school_id to NULL and ensures athletes are properly separated

DO $$
DECLARE
  lynchburg_school_id UUID;
  cameron_athlete_id UUID;
  admin_user_id UUID;
  lynchburg_coach_id UUID;
  fixed_count INT := 0;
BEGIN
  -- Get school IDs
  SELECT id INTO lynchburg_school_id 
  FROM schools 
  WHERE name ILIKE '%Lynchburg%' 
  LIMIT 1;

  IF lynchburg_school_id IS NULL THEN
    RAISE EXCEPTION 'Lynchburg College not found';
  END IF;

  -- Find Cameron Gue
  SELECT id INTO cameron_athlete_id 
  FROM athletes 
  WHERE (
    name ILIKE '%Cameron%Gue%' OR 
    name ILIKE '%Cameron Gue%' OR
    ("firstName" ILIKE '%Cameron%' AND "lastName" ILIKE '%Gue%')
  )
  AND graduationyear = 2026
  LIMIT 1;

  IF cameron_athlete_id IS NULL THEN
    RAISE EXCEPTION 'Cameron Gue not found';
  END IF;

  RAISE NOTICE 'Starting cleanup...';
  RAISE NOTICE 'Lynchburg School ID: %', lynchburg_school_id;
  RAISE NOTICE 'Cameron Gue ID: %', cameron_athlete_id;

  -- STEP 1: Reset ALL admin school_id to NULL
  -- Admins should not be assigned to specific schools
  UPDATE user_profiles
  SET school_id = NULL
  WHERE (is_admin = TRUE OR role = 'admin')
  AND school_id IS NOT NULL;

  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'Reset % admin users school_id to NULL', fixed_count;

  -- STEP 2: Find or create a Lynchburg coach for Cameron
  -- Try to find an existing coach assigned to Lynchburg
  SELECT user_id INTO lynchburg_coach_id
  FROM user_profiles
  WHERE school_id = lynchburg_school_id
  AND role IN ('coach', 'college_coach')
  LIMIT 1;

  -- Delete Cameron's existing records
  DELETE FROM college_coach_stars
  WHERE athlete_id = cameron_athlete_id;

  -- Get an admin user for admin-added prospects
  SELECT user_id INTO admin_user_id
  FROM user_profiles
  WHERE (is_admin = TRUE OR role = 'admin')
  ORDER BY 
    CASE WHEN school_id IS NULL THEN 0 ELSE 1 END
  LIMIT 1;

  IF lynchburg_coach_id IS NOT NULL THEN
    -- If coaches exist, associate with a coach
    INSERT INTO college_coach_stars (
      coach_user_id,
      athlete_id,
      pipeline_stage,
      interest_level,
      notes,
      starred_at
    )
    VALUES (
      lynchburg_coach_id,
      cameron_athlete_id,
      'Committed',
      'high',
      'Added by admin - Committed to Lynchburg College. Announcement made on Friday.',
      NOW()
    );

    RAISE NOTICE 'Cameron Gue now associated with Lynchburg coach: %', lynchburg_coach_id;
  ELSIF admin_user_id IS NOT NULL THEN
    -- If no coaches, associate with admin (admins can see via portal preview)
    INSERT INTO college_coach_stars (
      coach_user_id,
      athlete_id,
      pipeline_stage,
      interest_level,
      notes,
      starred_at
    )
    VALUES (
      admin_user_id,
      cameron_athlete_id,
      'Committed',
      'high',
      'Added by admin - Committed to Lynchburg College. Announcement made on Friday.',
      NOW()
    );

    RAISE NOTICE 'Cameron Gue now associated with admin user: % (will be visible to admins in Lynchburg portal)', admin_user_id;
  ELSE
    RAISE EXCEPTION 'No coaches or admins found to associate Cameron Gue with';
  END IF;

  -- STEP 3: Verify no cross-contamination
  -- Check that no athletes are associated with admins who have school_id set
  IF EXISTS (
    SELECT 1 FROM college_coach_stars ccs
    JOIN user_profiles up ON up.user_id = ccs.coach_user_id
    WHERE up.school_id IS NOT NULL
    AND (up.is_admin = TRUE OR up.role = 'admin')
  ) THEN
    RAISE WARNING 'Found athletes associated with admins who have school_id set. These need manual cleanup.';
  ELSE
    RAISE NOTICE 'VERIFIED: No athletes associated with admins who have school_id set';
  END IF;

  RAISE NOTICE 'Cleanup complete!';
  RAISE NOTICE 'Admins no longer have school_id assignments';
  
  IF lynchburg_coach_id IS NULL THEN
    RAISE NOTICE 'ACTION REQUIRED: Assign at least one coach to Lynchburg College, then re-run the add-cameron script';
  END IF;

END $$;

