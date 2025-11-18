-- Fix Kavan Wilson to appear in Reinhardt University portal funnel
-- Run this in Supabase SQL Editor

-- Step 1: Find Kavan Wilson and verify his commitment
DO $$
DECLARE
    athlete_record RECORD;
    school_record RECORD;
    coach_user_id_var UUID;
    existing_star_id UUID;
BEGIN
    -- Find Kavan Wilson
    SELECT id, name, college, recruiting_status
    INTO athlete_record
    FROM athletes
    WHERE name ILIKE '%Kavan Wilson%'
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Athlete "Kavan Wilson" not found';
    END IF;

    RAISE NOTICE 'Found athlete: % (ID: %) - College: % - Status: %', 
        athlete_record.name, athlete_record.id, athlete_record.college, athlete_record.recruiting_status;

    -- Verify he's committed
    IF athlete_record.recruiting_status NOT IN ('Committed', 'Signed', 'College Athlete') THEN
        RAISE EXCEPTION 'Athlete status is not Committed/Signed. Current status: %', athlete_record.recruiting_status;
    END IF;

    IF athlete_record.college IS NULL OR athlete_record.college = '' THEN
        RAISE EXCEPTION 'Athlete has no college set';
    END IF;

    -- Find Reinhardt University (try multiple variations)
    SELECT id, name
    INTO school_record
    FROM schools
    WHERE name ILIKE '%Reinhardt%'
       OR name ILIKE '%Reinhardt University%'
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'School "Reinhardt University" not found in schools table';
    END IF;

    RAISE NOTICE 'Found school: % (ID: %)', school_record.name, school_record.id;

    -- Get a coach for this school (prefer school coaches, fallback to admin)
    SELECT up.user_id
    INTO coach_user_id_var
    FROM user_profiles up
    WHERE up.school_id = school_record.id
    LIMIT 1;

    -- If no school coach, use admin
    IF coach_user_id_var IS NULL THEN
        SELECT up.user_id
        INTO coach_user_id_var
        FROM user_profiles up
        WHERE up.is_admin = true OR up.role = 'admin'
        LIMIT 1;
    END IF;

    IF coach_user_id_var IS NULL THEN
        RAISE EXCEPTION 'No coach found for school and no admin available';
    END IF;

    RAISE NOTICE 'Using coach user_id: %', coach_user_id_var;

    -- Check if star entry already exists
    SELECT id
    INTO existing_star_id
    FROM college_coach_stars
    WHERE athlete_id = athlete_record.id
      AND coach_user_id = coach_user_id_var
    LIMIT 1;

    IF existing_star_id IS NOT NULL THEN
        -- Update existing entry
        UPDATE college_coach_stars
        SET pipeline_stage = 'Committed',
            interest_level = 'high',
            committed_date = NOW(),
            updated_at = NOW()
        WHERE id = existing_star_id;

        RAISE NOTICE 'Updated existing star entry (ID: %) to Committed', existing_star_id;
    ELSE
                -- Create new entry
                INSERT INTO college_coach_stars (
                    coach_user_id,
                    athlete_id,
                    pipeline_stage,
                    interest_level,
                    notes,
                    starred_at,
                    committed_date,
                    created_at,
                    updated_at
                ) VALUES (
                    coach_user_id_var,
                    athlete_record.id,
                    'Committed',
                    'high',
                    'Auto-added via SQL script on ' || CURRENT_DATE || ' – committed to ' || athlete_record.college,
                    NOW(),
                    NOW(),
                    NOW(),
                    NOW()
                );

        RAISE NOTICE 'Created new star entry for athlete in school portal';
    END IF;

    RAISE NOTICE 'SUCCESS: Kavan Wilson should now appear in Reinhardt University portal funnel!';
END $$;

-- Verify the result
SELECT 
    a.name as athlete_name,
    a.college,
    a.recruiting_status,
    s.name as school_name,
    ccs.pipeline_stage,
    ccs.created_at as star_created_at
FROM athletes a
JOIN college_coach_stars ccs ON ccs.athlete_id = a.id
JOIN schools s ON s.id = ccs.school_id
WHERE a.name ILIKE '%Kavan Wilson%'
  AND s.name ILIKE '%Reinhardt%'
ORDER BY ccs.created_at DESC;

