-- Check Cameron Gue's association with Lynchburg College
DO $$
DECLARE
  lynchburg_school_id UUID;
  cameron_athlete_id UUID;
  cameron_star_record RECORD;
  school_coaches_count INT;
  admin_user_count INT;
BEGIN
  -- Get Lynchburg College school ID
  SELECT id INTO lynchburg_school_id
  FROM schools
  WHERE name ILIKE '%Lynchburg%'
  LIMIT 1;

  IF lynchburg_school_id IS NULL THEN
    RAISE EXCEPTION 'Lynchburg College not found';
  END IF;

  RAISE NOTICE 'Lynchburg School ID: %', lynchburg_school_id;

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

  RAISE NOTICE 'Cameron Gue Athlete ID: %', cameron_athlete_id;

  -- Check coaches for Lynchburg
  SELECT COUNT(*) INTO school_coaches_count
  FROM user_profiles
  WHERE school_id = lynchburg_school_id;

  RAISE NOTICE 'Coaches at Lynchburg: %', school_coaches_count;

  -- Check Cameron's college_coach_stars records
  RAISE NOTICE '=== Cameron Gue college_coach_stars records ===';
  FOR cameron_star_record IN 
    SELECT 
      ccs.id,
      ccs.coach_user_id,
      ccs.pipeline_stage,
      ccs.notes,
      up.email as coach_email,
      up.school_id as coach_school_id,
      s.name as school_name
    FROM college_coach_stars ccs
    LEFT JOIN user_profiles up ON up.user_id = ccs.coach_user_id
    LEFT JOIN schools s ON s.id = up.school_id
    WHERE ccs.athlete_id = cameron_athlete_id
  LOOP
    RAISE NOTICE 'Star ID: %, Coach: %, Stage: %, Notes: %', 
      cameron_star_record.id,
      cameron_star_record.coach_email,
      cameron_star_record.pipeline_stage,
      LEFT(cameron_star_record.notes, 50);
    RAISE NOTICE '  Coach School ID: %, School Name: %', 
      cameron_star_record.coach_school_id,
      cameron_star_record.school_name;
  END LOOP;

  -- Check if any admin users
  SELECT COUNT(*) INTO admin_user_count
  FROM user_profiles
  WHERE (is_admin = TRUE OR role = 'admin')
  AND (school_id IS NULL OR school_id != lynchburg_school_id);

  RAISE NOTICE 'Admin users (not tied to Lynchburg): %', admin_user_count;

END $$;

