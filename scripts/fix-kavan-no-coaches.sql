-- Fix for when Reinhardt has no coaches assigned
-- This will use an admin coach as fallback

DO $$
DECLARE
    kavan_id UUID;
    reinhardt_school_id UUID := 'f0962bcc-6db5-4210-8447-a541dd18cb72';
    admin_coach_id UUID;
    existing_star_id UUID;
BEGIN
    -- Get Kavan's ID
    SELECT id INTO kavan_id
    FROM athletes
    WHERE name ILIKE '%Kavan%Wilson%'
    LIMIT 1;

    IF kavan_id IS NULL THEN
        RAISE EXCEPTION 'Kavan Wilson not found';
    END IF;

    RAISE NOTICE 'Found Kavan: %', kavan_id;

    -- Get an admin coach (since Reinhardt has no coaches)
    SELECT user_id INTO admin_coach_id
    FROM user_profiles
    WHERE (is_admin = true OR role = 'admin')
    LIMIT 1;

    IF admin_coach_id IS NULL THEN
        RAISE EXCEPTION 'No admin coach found';
    END IF;

    RAISE NOTICE 'Using admin coach: %', admin_coach_id;

    -- Check if star entry already exists
    SELECT id INTO existing_star_id
    FROM college_coach_stars
    WHERE athlete_id = kavan_id
      AND coach_user_id = admin_coach_id
    LIMIT 1;

    IF existing_star_id IS NOT NULL THEN
        -- Update existing
        UPDATE college_coach_stars
        SET pipeline_stage = 'Committed',
            interest_level = 'high',
            committed_date = NOW()
        WHERE id = existing_star_id;
        RAISE NOTICE 'Updated existing star entry';
    ELSE
        -- Create new
        INSERT INTO college_coach_stars (
            coach_user_id,
            athlete_id,
            pipeline_stage,
            interest_level,
            notes,
            starred_at,
            committed_date
        ) VALUES (
            admin_coach_id,
            kavan_id,
            'Committed',
            'high',
            'Committed to Reinhardt University',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Created new star entry';
    END IF;

    RAISE NOTICE 'Done! But note: Portal may not show this if accessed by a non-admin user.';
    RAISE NOTICE 'You may need to assign a coach to Reinhardt school for it to show properly.';

END $$;

-- BUT WAIT - the real issue is the portal filters by school coaches
-- So we need to either:
-- 1. Assign a coach to Reinhardt, OR
-- 2. Make sure the portal can see admin-added entries

-- Let's check what the portal API actually sees
SELECT 
    'What Portal Sees' as info,
    a.name,
    ccs.pipeline_stage,
    up.email as coach_email,
    up.school_id,
    s.name as school_name
FROM athletes a
JOIN college_coach_stars ccs ON ccs.athlete_id = a.id
JOIN user_profiles up ON up.user_id = ccs.coach_user_id
LEFT JOIN schools s ON s.id = up.school_id
WHERE a.name ILIKE '%Kavan%Wilson%';

