-- Complete fix for Kavan Wilson in Reinhardt portal
-- This handles all edge cases

-- First, let's see what we're working with
DO $$
DECLARE
    kavan_id UUID;
    reinhardt_school_id UUID;
    reinhardt_coach_id UUID;
    existing_count INTEGER;
BEGIN
    -- Get Kavan's ID
    SELECT id INTO kavan_id
    FROM athletes
    WHERE name ILIKE '%Kavan%Wilson%'
    LIMIT 1;

    IF kavan_id IS NULL THEN
        RAISE EXCEPTION 'Kavan Wilson not found in athletes table';
    END IF;

    RAISE NOTICE 'Found Kavan Wilson: %', kavan_id;

    -- Get Reinhardt school ID
    SELECT id INTO reinhardt_school_id
    FROM schools
    WHERE name ILIKE '%Reinhardt%'
    LIMIT 1;

    IF reinhardt_school_id IS NULL THEN
        RAISE EXCEPTION 'Reinhardt University not found in schools table';
    END IF;

    RAISE NOTICE 'Found Reinhardt school: %', reinhardt_school_id;

    -- Get a coach for Reinhardt (prefer verified coach, then any user, then admin)
    SELECT user_id INTO reinhardt_coach_id
    FROM user_profiles
    WHERE school_id = reinhardt_school_id
      AND (verified_coach = true OR role = 'coach')
    LIMIT 1;

    IF reinhardt_coach_id IS NULL THEN
        SELECT user_id INTO reinhardt_coach_id
        FROM user_profiles
        WHERE school_id = reinhardt_school_id
        LIMIT 1;
    END IF;

    IF reinhardt_coach_id IS NULL THEN
        SELECT user_id INTO reinhardt_coach_id
        FROM user_profiles
        WHERE is_admin = true OR role = 'admin'
        LIMIT 1;
    END IF;

    IF reinhardt_coach_id IS NULL THEN
        RAISE EXCEPTION 'No coach found for Reinhardt and no admin available';
    END IF;

    RAISE NOTICE 'Using coach: %', reinhardt_coach_id;

    -- Delete ALL existing star entries for Kavan (clean slate)
    DELETE FROM college_coach_stars
    WHERE athlete_id = kavan_id;

    RAISE NOTICE 'Deleted existing star entries';

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
        kavan_id,
        'Committed',
        'high',
        'Committed to Reinhardt University',
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Created new star entry';
    RAISE NOTICE 'SUCCESS! Kavan should now appear in Reinhardt portal';

END $$;

-- Verify the fix
SELECT 
    'VERIFICATION' as status,
    a.name,
    a.college,
    a.recruiting_status,
    ccs.pipeline_stage,
    up.email as coach_email,
    s.name as school_name,
    CASE 
        WHEN ccs.id IS NOT NULL AND s.id IS NOT NULL THEN '✅ WILL APPEAR IN PORTAL'
        ELSE '❌ WILL NOT APPEAR'
    END as result
FROM athletes a
LEFT JOIN college_coach_stars ccs ON ccs.athlete_id = a.id
LEFT JOIN user_profiles up ON up.user_id = ccs.coach_user_id
LEFT JOIN schools s ON s.id = up.school_id
WHERE a.name ILIKE '%Kavan%Wilson%';




