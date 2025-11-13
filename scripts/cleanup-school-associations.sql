-- Comprehensive cleanup to ensure athletes are only associated with coaches from their correct school
-- This prevents cross-school contamination

DO $$
DECLARE
  lynchburg_school_id UUID;
  nc_united_school_id UUID;
  cameron_athlete_id UUID;
  lynchburg_admin_id UUID;
  nc_united_admin_id UUID;
  athlete_record RECORD;
  deleted_count INT := 0;
  moved_count INT := 0;
BEGIN
  -- Get school IDs
  SELECT id INTO lynchburg_school_id 
  FROM schools 
  WHERE name ILIKE '%Lynchburg%' 
  LIMIT 1;

  SELECT id INTO nc_united_school_id 
  FROM schools 
  WHERE (name ILIKE '%NC United%' OR name ILIKE '%NC United Wrestling%')
  AND (is_test IS NULL OR is_test = FALSE)
  LIMIT 1;

  IF lynchburg_school_id IS NULL THEN
    RAISE EXCEPTION 'Lynchburg College not found';
  END IF;

  RAISE NOTICE 'Lynchburg School ID: %', lynchburg_school_id;
  RAISE NOTICE 'NC United School ID: %', COALESCE(nc_united_school_id::TEXT, 'NOT FOUND');

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

  RAISE NOTICE 'Cameron Gue ID: %', cameron_athlete_id;

  -- STEP 1: Find or create separate admin users for each school
  -- Lynchburg admin
  SELECT user_id INTO lynchburg_admin_id
  FROM user_profiles
  WHERE school_id = lynchburg_school_id
  AND (is_admin = TRUE OR role = 'admin')
  LIMIT 1;

  IF lynchburg_admin_id IS NULL THEN
    -- Get an admin and assign to Lynchburg
    SELECT user_id INTO lynchburg_admin_id
    FROM user_profiles
    WHERE (is_admin = TRUE OR role = 'admin')
    AND (school_id IS NULL OR school_id != nc_united_school_id)
    ORDER BY 
      CASE WHEN school_id IS NULL THEN 0 ELSE 1 END
    LIMIT 1;

    IF lynchburg_admin_id IS NOT NULL THEN
      UPDATE user_profiles
      SET school_id = lynchburg_school_id
      WHERE user_id = lynchburg_admin_id;
      RAISE NOTICE 'Assigned admin % to Lynchburg', lynchburg_admin_id;
    END IF;
  END IF;

  -- NC United admin (if NC United exists)
  IF nc_united_school_id IS NOT NULL THEN
    SELECT user_id INTO nc_united_admin_id
    FROM user_profiles
    WHERE school_id = nc_united_school_id
    AND (is_admin = TRUE OR role = 'admin')
    LIMIT 1;

    IF nc_united_admin_id IS NULL THEN
      -- Get a different admin for NC United
      SELECT user_id INTO nc_united_admin_id
      FROM user_profiles
      WHERE (is_admin = TRUE OR role = 'admin')
      AND user_id != lynchburg_admin_id
      AND (school_id IS NULL OR school_id != lynchburg_school_id)
      ORDER BY 
        CASE WHEN school_id IS NULL THEN 0 ELSE 1 END
      LIMIT 1;

      IF nc_united_admin_id IS NOT NULL THEN
        UPDATE user_profiles
        SET school_id = nc_united_school_id
        WHERE user_id = nc_united_admin_id;
        RAISE NOTICE 'Assigned admin % to NC United', nc_united_admin_id;
      END IF;
    END IF;
  END IF;

  -- STEP 2: Delete ALL existing records for Cameron Gue
  -- We'll recreate only the Lynchburg one
  DELETE FROM college_coach_stars
  WHERE athlete_id = cameron_athlete_id;

  RAISE NOTICE 'Deleted all existing records for Cameron Gue';

  -- STEP 3: Create ONLY the Lynchburg association for Cameron
  IF lynchburg_admin_id IS NOT NULL THEN
    INSERT INTO college_coach_stars (
      coach_user_id,
      athlete_id,
      pipeline_stage,
      interest_level,
      notes,
      starred_at
    )
    VALUES (
      lynchburg_admin_id,
      cameron_athlete_id,
      'Committed',
      'high',
      'Added by admin - Committed to Lynchburg College. Announcement made on Friday.',
      NOW()
    );

    RAISE NOTICE 'Created Cameron Gue record for Lynchburg only';
  END IF;

  -- STEP 4: Clean up cross-contamination
  -- Delete any athlete records where coach is from wrong school
  -- This is a safety check - in normal operation, coaches should only see their school's athletes
  FOR athlete_record IN
    SELECT 
      ccs.id,
      ccs.athlete_id,
      a.name as athlete_name,
      ccs.coach_user_id,
      up.school_id as coach_school_id,
      up.email as coach_email
    FROM college_coach_stars ccs
    JOIN athletes a ON a.id = ccs.athlete_id
    JOIN user_profiles up ON up.user_id = ccs.coach_user_id
    WHERE up.school_id IS NOT NULL
    AND (
      -- If this is Cameron Gue and coach is NOT from Lynchburg, delete it
      (ccs.athlete_id = cameron_athlete_id AND up.school_id != lynchburg_school_id)
    )
  LOOP
    DELETE FROM college_coach_stars WHERE id = athlete_record.id;
    deleted_count := deleted_count + 1;
    RAISE NOTICE 'Deleted cross-contamination: % (coach from school %)',
      athlete_record.athlete_name,
      athlete_record.coach_school_id;
  END LOOP;

  -- STEP 5: Report any remaining potential issues
  RAISE NOTICE 'Cleanup complete. Deleted % cross-contaminated records.', deleted_count;

  -- Verify Cameron is only in Lynchburg
  IF EXISTS (
    SELECT 1 FROM college_coach_stars ccs
    JOIN user_profiles up ON up.user_id = ccs.coach_user_id
    WHERE ccs.athlete_id = cameron_athlete_id
    AND up.school_id != lynchburg_school_id
  ) THEN
    RAISE WARNING 'WARNING: Cameron Gue still has associations with wrong schools!';
  ELSE
    RAISE NOTICE 'VERIFIED: Cameron Gue is ONLY associated with Lynchburg';
  END IF;

  -- Verify no athletes appear in multiple schools (for the same user)
  IF EXISTS (
    SELECT ccs1.athlete_id, COUNT(DISTINCT up1.school_id) as school_count
    FROM college_coach_stars ccs1
    JOIN user_profiles up1 ON up1.user_id = ccs1.coach_user_id
    WHERE up1.school_id IS NOT NULL
    GROUP BY ccs1.athlete_id
    HAVING COUNT(DISTINCT up1.school_id) > 1
  ) THEN
    RAISE WARNING 'WARNING: Some athletes appear in multiple schools. Manual review recommended.';
  ELSE
    RAISE NOTICE 'VERIFIED: No athletes appear in multiple schools';
  END IF;

END $$;
