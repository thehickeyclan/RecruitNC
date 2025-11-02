DO $$
DECLARE
  lynchburg_school_id UUID;
  cameron_athlete_id UUID;
  admin_user_id UUID;
BEGIN
  SELECT id INTO lynchburg_school_id 
  FROM schools 
  WHERE name ILIKE '%Lynchburg%' 
  LIMIT 1;

  IF lynchburg_school_id IS NULL THEN
    RAISE EXCEPTION 'Lynchburg College not found in schools table';
  END IF;

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

  SELECT user_id INTO admin_user_id
  FROM user_profiles
  WHERE (
    is_admin = TRUE 
    OR role = 'admin'
    OR (school_id = lynchburg_school_id AND role IN ('coach', 'college_coach'))
  )
  ORDER BY 
    CASE WHEN is_admin = TRUE OR role = 'admin' THEN 0 ELSE 1 END,
    CASE WHEN school_id = lynchburg_school_id THEN 0 ELSE 1 END
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    SELECT user_id INTO admin_user_id
    FROM user_profiles
    WHERE is_admin = TRUE OR role = 'admin'
    LIMIT 1;
  END IF;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No admin or coach user found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM college_coach_stars
    WHERE athlete_id = cameron_athlete_id
    AND coach_user_id = admin_user_id
  ) THEN
    UPDATE college_coach_stars
    SET 
      pipeline_stage = 'Committed',
      interest_level = 'high',
      notes = COALESCE(notes, '') || E'\n\nUpdated: Committed to Lynchburg College - Announcement on Friday'
    WHERE athlete_id = cameron_athlete_id
    AND coach_user_id = admin_user_id;
    
    RAISE NOTICE 'Updated Cameron Gue pipeline stage to Committed for Lynchburg';
  ELSE
    IF EXISTS (
      SELECT 1 FROM college_coach_stars
      WHERE athlete_id = cameron_athlete_id
      AND coach_user_id IN (
        SELECT user_id FROM user_profiles WHERE school_id = lynchburg_school_id
      )
    ) THEN
      UPDATE college_coach_stars
      SET 
        pipeline_stage = 'Committed',
        interest_level = 'high',
        notes = COALESCE(notes, '') || E'\n\nUpdated: Committed to Lynchburg College - Announcement on Friday'
      WHERE id = (
        SELECT id FROM college_coach_stars
        WHERE athlete_id = cameron_athlete_id
        AND coach_user_id IN (
          SELECT user_id FROM user_profiles WHERE school_id = lynchburg_school_id
        )
        LIMIT 1
      );
      
      RAISE NOTICE 'Updated Cameron Gue pipeline stage to Committed for Lynchburg';
    ELSE
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
      
      RAISE NOTICE 'Added Cameron Gue to Lynchburg pipeline as Committed';
    END IF;
  END IF;

  RAISE NOTICE 'Lynchburg School ID: %', lynchburg_school_id;
  RAISE NOTICE 'Cameron Gue Athlete ID: %', cameron_athlete_id;
  RAISE NOTICE 'Coach/Admin User ID: %', admin_user_id;
END $$;

