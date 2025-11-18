-- Fix ALL committed athletes to appear in their school portals
-- This will create/update star entries for all committed athletes
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    athlete_record RECORD;
    school_record RECORD;
    coach_user_id_var UUID;
    existing_star_id UUID;
    fixed_count INTEGER := 0;
    skipped_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Loop through all committed athletes
    FOR athlete_record IN 
        SELECT id, name, college, recruiting_status
        FROM athletes
        WHERE recruiting_status IN ('Committed', 'Signed', 'College Athlete')
          AND college IS NOT NULL
          AND college != ''
        ORDER BY name
    LOOP
        BEGIN
            -- Try to find the school (multiple variations)
            SELECT id, name
            INTO school_record
            FROM schools
            WHERE name ILIKE '%' || REPLACE(REPLACE(REPLACE(athlete_record.college, 'College', ''), 'University', ''), 'Institute', '') || '%'
               OR name ILIKE '%' || athlete_record.college || '%'
               OR athlete_record.college ILIKE '%' || name || '%'
            LIMIT 1;

            -- If not found, try just the first word
            IF NOT FOUND THEN
                SELECT id, name
                INTO school_record
                FROM schools
                WHERE name ILIKE '%' || SPLIT_PART(athlete_record.college, ' ', 1) || '%'
                LIMIT 1;
            END IF;

            IF NOT FOUND THEN
                RAISE NOTICE 'Skipping % - School "%" not found', athlete_record.name, athlete_record.college;
                skipped_count := skipped_count + 1;
                CONTINUE;
            END IF;

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
                RAISE NOTICE 'Skipping % - No coach available for school %', athlete_record.name, school_record.name;
                skipped_count := skipped_count + 1;
                CONTINUE;
            END IF;

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
                    committed_date = COALESCE(committed_date, NOW()),
                    updated_at = NOW()
                WHERE id = existing_star_id
                  AND pipeline_stage NOT IN ('Committed', 'Signed');

                fixed_count := fixed_count + 1;
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

                fixed_count := fixed_count + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error processing %: %', athlete_record.name, SQLERRM;
            error_count := error_count + 1;
        END;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  Fixed: % athletes', fixed_count;
    RAISE NOTICE '  Skipped: % athletes (school not found or no coach)', skipped_count;
    RAISE NOTICE '  Errors: % athletes', error_count;
    RAISE NOTICE '========================================';
END $$;

-- Show summary of committed athletes and their portal status
SELECT 
    a.name as athlete_name,
    a.college,
    a.recruiting_status,
    s.name as school_name,
    CASE WHEN ccs.id IS NOT NULL THEN 'Yes' ELSE 'No' END as in_portal,
    ccs.pipeline_stage
FROM athletes a
LEFT JOIN college_coach_stars ccs ON ccs.athlete_id = a.id 
    AND ccs.pipeline_stage IN ('Committed', 'Signed')
LEFT JOIN schools s ON s.id = ccs.school_id
WHERE a.recruiting_status IN ('Committed', 'Signed', 'College Athlete')
  AND a.college IS NOT NULL
  AND a.college != ''
ORDER BY 
    CASE WHEN ccs.id IS NOT NULL THEN 0 ELSE 1 END, -- Show missing ones first
    a.name;

