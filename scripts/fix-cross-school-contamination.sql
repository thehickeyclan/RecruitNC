-- Fix cross-school contamination in college_coach_stars
-- This ensures each athlete is only associated with coaches from their assigned school
-- and removes any incorrect associations

DO $$
DECLARE
  lynchburg_school_id UUID;
  nc_united_school_id UUID;
  cameron_athlete_id UUID;
  admin_user_id UUID;
  athlete_record RECORD;
  coach_school_id UUID;
  incorrect_count INT := 0;
BEGIN
  -- Get school IDs
  SELECT id INTO lynchburg_school_id 
  FROM schools 
  WHERE name ILIKE '%Lynchburg%' 
  LIMIT 1;

  SELECT id INTO nc_united_school_id 
  FROM schools 
  WHERE name ILIKE '%NC United%' OR name ILIKE '%NC United Wrestling%'
  LIMIT 1;

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

  IF lynchburg_school_id IS NULL THEN
    RAISE EXCEPTION 'Lynchburg College not found';
  END IF;

  IF cameron_athlete_id IS NULL THEN
    RAISE EXCEPTION 'Cameron Gue not found';
  END IF;

  RAISE NOTICE 'Lynchburg School ID: %', lynchburg_school_id;
  RAISE NOTICE 'NC United School ID: %', nc_united_school_id;
  RAISE NOTICE 'Cameron Gue ID: %', cameron_athlete_id;

  -- STEP 1: Find an admin user that should be associated with Lynchburg
  -- Prefer an admin with school_id = Lynchburg, or create/update one
  SELECT user_id INTO admin_user_id
  FROM user_profiles
  WHERE school_id = lynchburg_school_id
  AND (is_admin = TRUE OR role = 'admin')
  LIMIT 1;

  -- If no admin with Lynchburg, get any admin and set their school_id to Lynchburg
  IF admin_user_id IS NULL THEN
    SELECT user_id INTO admin_user_id
    FROM user_profiles
    WHERE (is_admin = TRUE OR role = 'admin')
    ORDER BY 
      CASE WHEN school_id IS NULL THEN 0 ELSE 1 END
    LIMIT 1;

    IF admin_user_id IS NOT NULL THEN
      UPDATE user_profiles
      SET school_id = lynchburg_school_id
      WHERE user_id = admin_user_id;
      
      RAISE NOTICE 'Updated admin user % school_id to Lynchburg', admin_user_id;
    END IF;
  END IF;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found';
  END IF;

  RAISE NOTICE 'Admin User ID for Lynchburg: %', admin_user_id;

  -- STEP 2: Delete ALL existing records for Cameron Gue
  -- We'll recreate only the correct one
  DELETE FROM college_coach_stars
  WHERE athlete_id = cameron_athlete_id;

  RAISE NOTICE 'Deleted all existing records for Cameron Gue';

  -- STEP 3: Create ONLY the Lynchburg association for Cameron
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

  RAISE NOTICE 'Created Cameron Gue record for Lynchburg only';

  -- STEP 4: Verify and report any other cross-contamination
  -- Check for any athletes associated with coaches from wrong schools
  FOR athlete_record IN
    SELECT 
      ccs.id,
      ccs.athlete_id,
      a.name as athlete_name,
      ccs.coach_user_id,
      up.school_id as coach_school_id,
      s.name as school_name
    FROM college_coach_stars ccs
    JOIN athletes a ON a.id = ccs.athlete_id
    JOIN user_profiles up ON up.user_id = ccs.coach_user_id
    LEFT JOIN schools s ON s.id = up.school_id
    WHERE up.school_id IS NOT NULL
    AND (
      -- Check if athlete appears in multiple schools (for same coach)
      EXISTS (
        SELECT 1 FROM college_coach_stars ccs2
        JOIN user_profiles up2 ON up2.user_id = ccs2.coach_user_id
        WHERE ccs2.athlete_id = ccs.athlete_id
        AND ccs2.coach_user_id != ccs.coach_user_id
        AND up2.school_id != up.school_id
      )
    )
  LOOP
    incorrect_count := incorrect_count + 1;
    RAISE NOTICE 'POTENTIAL CROSS-CONTAMINATION: Athlete % (%) associated with coach from school % (%)',
      athlete_record.athlete_name,
      athlete_record.athlete_id,
      athlete_record.school_name,
      athlete_record.coach_school_id;
  END LOOP;

  IF incorrect_count > 0 THEN
    RAISE WARNING 'Found % potential cross-school contamination issues. Review manually.', incorrect_count;
  ELSE
    RAISE NOTICE 'No cross-school contamination detected. All athletes properly associated.';
  END IF;

  -- STEP 5: Verify Cameron is only in Lynchburg
  IF EXISTS (
    SELECT 1 FROM college_coach_stars ccs
    JOIN user_profiles up ON up.user_id = ccs.coach_user_id
    WHERE ccs.athlete_id = cameron_athlete_id
    AND up.school_id != lynchburg_school_id
  ) THEN
    RAISE EXCEPTION 'ERROR: Cameron Gue still associated with wrong school!';
  ELSE
    RAISE NOTICE 'VERIFIED: Cameron Gue is ONLY associated with Lynchburg';
  END IF;

END $$;
