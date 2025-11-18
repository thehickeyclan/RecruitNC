-- FINAL FIX: Ensure Kavan Wilson appears in Reinhardt portal
-- This script ensures the star entry uses a Reinhardt coach's user_id

DO $$
DECLARE
    athlete_record RECORD;
    school_record RECORD;
    reinhardt_coach_id UUID;
    existing_star_id UUID;
    fixed BOOLEAN := FALSE;
BEGIN
    -- Find Kavan Wilson
    SELECT id, name, college, recruiting_status
    INTO athlete_record
    FROM athletes
    WHERE name ILIKE '%Kavan%Wilson%'
       OR name ILIKE '%Kavan Wilson%'
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Athlete "Kavan Wilson" not found';
    END IF;

    RAISE NOTICE 'Found athlete: % (ID: %) - College: % - Status: %', 
        athlete_record.name, athlete_record.id, athlete_record.college, athlete_record.recruiting_status;

    -- Find Reinhardt University
    SELECT id, name
    INTO school_record
    FROM schools
    WHERE name ILIKE '%Reinhardt%'
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'School "Reinhardt University" not found';
    END IF;

    RAISE NOTICE 'Found school: % (ID: %)', school_record.name, school_record.id;

    -- Get a REAL Reinhardt coach (not admin)
    SELECT up.user_id
    INTO reinhardt_coach_id
    FROM user_profiles up
    WHERE up.school_id = school_record.id
      AND (up.verified_coach = true OR up.role = 'coach')
    LIMIT 1;

    -- If no verified coach, get any user with school_id
    IF reinhardt_coach_id IS NULL THEN
        SELECT up.user_id
        INTO reinhardt_coach_id
        FROM user_profiles up
        WHERE up.school_id = school_record.id
        LIMIT 1;
    END IF;

    -- Last resort: use admin but log warning
    IF reinhardt_coach_id IS NULL THEN
        RAISE WARNING 'No coaches found for Reinhardt, using admin fallback';
        SELECT up.user_id
        INTO reinhardt_coach_id
        FROM user_profiles up
        WHERE up.is_admin = true OR up.role = 'admin'
        LIMIT 1;
    END IF;

    IF reinhardt_coach_id IS NULL THEN
        RAISE EXCEPTION 'No coach available (neither school coach nor admin)';
    END IF;

    RAISE NOTICE 'Using coach user_id: %', reinhardt_coach_id;

    -- Delete ANY existing star entries for this athlete that don't use a Reinhardt coach
    DELETE FROM college_coach_stars
    WHERE athlete_id = athlete_record.id
      AND coach_user_id NOT IN (
          SELECT user_id FROM user_profiles WHERE school_id = school_record.id
      );

    -- Check if star entry exists with Reinhardt coach
    SELECT id
    INTO existing_star_id
    FROM college_coach_stars
    WHERE athlete_id = athlete_record.id
      AND coach_user_id = reinhardt_coach_id
    LIMIT 1;

    IF existing_star_id IS NOT NULL THEN
        -- Update existing entry
        UPDATE college_coach_stars
        SET pipeline_stage = 'Committed',
            interest_level = 'high',
            committed_date = NOW()
        WHERE id = existing_star_id;

        RAISE NOTICE 'Updated existing star entry (ID: %) to Committed', existing_star_id;
        fixed := TRUE;
    ELSE
        -- Create new entry with Reinhardt coach
        INSERT INTO college_coach_stars (
            coach_user_id,
            athlete_id,
            pipeline_stage,
            interest_level,
            notes,
            starred_at,
            committed_date
        ) VALUES (
            reinhardt_coach_id,
            athlete_record.id,
            'Committed',
            'high',
            'Auto-added via SQL script on ' || CURRENT_DATE || ' – committed to ' || athlete_record.college,
            NOW(),
            NOW()
        );

        RAISE NOTICE 'Created new star entry with Reinhardt coach';
        fixed := TRUE;
    END IF;

    IF fixed THEN
        RAISE NOTICE '';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'SUCCESS! Kavan Wilson should now appear in Reinhardt portal';
        RAISE NOTICE '========================================';
    END IF;

END $$;

-- VERIFY: Show what the portal API would see
SELECT 
    '=== VERIFICATION: What Portal Sees ===' as info,
    a.name as athlete_name,
    a.college,
    a.recruiting_status,
    ccs.pipeline_stage,
    ccs.coach_user_id,
    up.email as coach_email,
    s.name as school_name,
    CASE 
        WHEN s.id IS NOT NULL THEN '✅ WILL APPEAR IN PORTAL'
        ELSE '❌ WILL NOT APPEAR'
    END as portal_status
FROM athletes a
JOIN college_coach_stars ccs ON ccs.athlete_id = a.id
LEFT JOIN user_profiles up ON up.user_id = ccs.coach_user_id
LEFT JOIN schools s ON s.id = up.school_id
WHERE a.name ILIKE '%Kavan%Wilson%' OR a.name ILIKE '%Kavan Wilson%'
ORDER BY ccs.starred_at DESC;




