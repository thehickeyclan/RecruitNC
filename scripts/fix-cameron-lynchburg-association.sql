-- Fix Cameron Gue's association with Lynchburg
-- This ensures he's associated with a user that has school_id = Lynchburg

DO $$
DECLARE
  lynchburg_school_id UUID;
  cameron_athlete_id UUID;
  admin_user_id UUID;
BEGIN
  -- Get Lynchburg College school ID
  SELECT id INTO lynchburg_school_id 
  FROM schools 
  WHERE name ILIKE '%Lynchburg%' 
  LIMIT 1;

  IF lynchburg_school_id IS NULL THEN
    RAISE EXCEPTION 'Lynchburg College not found in schools table';
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
    RAISE EXCEPTION 'Cameron Gue (Class of 2026) not found in athletes table';
  END IF;

  -- Find or create a user associated with Lynchburg
  -- First, try to find an admin that has school_id = Lynchburg
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
      -- Update admin's school_id to Lynchburg temporarily
      UPDATE user_profiles
      SET school_id = lynchburg_school_id
      WHERE user_id = admin_user_id;
      
      RAISE NOTICE 'Updated admin user school_id to Lynchburg: %', admin_user_id;
    END IF;
  END IF;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found';
  END IF;

  -- Delete any existing Cameron Gue records for this admin
  DELETE FROM college_coach_stars
  WHERE athlete_id = cameron_athlete_id
  AND coach_user_id = admin_user_id;

  -- Insert/update Cameron's record
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
  )
  ON CONFLICT (coach_user_id, athlete_id) DO UPDATE SET
    pipeline_stage = 'Committed',
    interest_level = 'high',
    notes = COALESCE(college_coach_stars.notes, '') || E'\n\nUpdated: Committed to Lynchburg College - Announcement on Friday';
  
  RAISE NOTICE 'Cameron Gue is now associated with user % (school_id = Lynchburg)', admin_user_id;
  RAISE NOTICE 'Lynchburg School ID: %', lynchburg_school_id;
  RAISE NOTICE 'Cameron Gue Athlete ID: %', cameron_athlete_id;
END $$;

