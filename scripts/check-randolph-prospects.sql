-- Check Randolph College prospects and their pipeline stages

DO $$
DECLARE
  randolph_school_id UUID;
  prospect_record RECORD;
BEGIN
  -- Get Randolph College school ID
  SELECT id INTO randolph_school_id
  FROM schools
  WHERE name ILIKE '%Randolph%'
  LIMIT 1;

  IF randolph_school_id IS NULL THEN
    RAISE EXCEPTION 'Randolph College not found';
  END IF;

  RAISE NOTICE 'Randolph School ID: %', randolph_school_id;
  RAISE NOTICE '==================================================';

  -- Check college_coach_stars for Randolph-associated prospects
  RAISE NOTICE 'Checking college_coach_stars for Randolph prospects...';
  
  FOR prospect_record IN 
    SELECT 
      ccs.athlete_id,
      ccs.pipeline_stage,
      ccs.interest_level,
      ccs.notes,
      a.name as athlete_name,
      a.graduationyear,
      a.college as athlete_college_field,
      up.email as coach_email,
      up.school_id as coach_school_id
    FROM college_coach_stars ccs
    LEFT JOIN athletes a ON a.id = ccs.athlete_id
    LEFT JOIN user_profiles up ON up.user_id = ccs.coach_user_id
    WHERE up.school_id = randolph_school_id
       OR ccs.notes ILIKE '%Randolph%'
  LOOP
    RAISE NOTICE 'Athlete: % (Class of %)', prospect_record.athlete_name, prospect_record.graduationyear;
    RAISE NOTICE '  Pipeline Stage: "%"', prospect_record.pipeline_stage;
    RAISE NOTICE '  Interest Level: %', prospect_record.interest_level;
    RAISE NOTICE '  Coach Email: %', prospect_record.coach_email;
    RAISE NOTICE '  Coach School ID: %', prospect_record.coach_school_id;
    RAISE NOTICE '  Notes: %', LEFT(prospect_record.notes, 100);
    RAISE NOTICE '  Athlete College Field: %', prospect_record.athlete_college_field;
    RAISE NOTICE '---';
  END LOOP;

  -- Also check athletes.college field
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Checking athletes.college field for Randolph...';
  
  FOR prospect_record IN
    SELECT 
      id,
      name,
      graduationyear,
      college,
      recruiting_status
    FROM athletes
    WHERE college ILIKE '%Randolph%'
  LOOP
    RAISE NOTICE 'Athlete: % (Class of %)', prospect_record.name, prospect_record.graduationyear;
    RAISE NOTICE '  College Field: %', prospect_record.college;
    RAISE NOTICE '  Recruiting Status: %', prospect_record.recruiting_status;
    RAISE NOTICE '---';
  END LOOP;

END $$;

