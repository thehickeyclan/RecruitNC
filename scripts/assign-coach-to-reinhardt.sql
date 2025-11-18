-- Assign a coach to Reinhardt University
-- This will make the portal work properly

-- Option 1: Assign an existing admin user to Reinhardt
UPDATE user_profiles
SET school_id = 'f0962bcc-6db5-4210-8447-a541dd18cb72'
WHERE user_id = (
    SELECT user_id
    FROM user_profiles
    WHERE (is_admin = true OR role = 'admin')
      AND (school_id IS NULL OR school_id != 'f0962bcc-6db5-4210-8447-a541dd18cb72')
    LIMIT 1
);

-- Verify the assignment
SELECT 
    'Reinhardt Coaches' as info,
    up.user_id,
    up.email,
    up.verified_coach,
    up.role,
    s.name as school_name
FROM user_profiles up
JOIN schools s ON s.id = up.school_id
WHERE s.id = 'f0962bcc-6db5-4210-8447-a541dd18cb72';

-- Now create the star entry for Kavan with this coach
INSERT INTO college_coach_stars (
    coach_user_id,
    athlete_id,
    pipeline_stage,
    interest_level,
    notes,
    starred_at,
    committed_date
)
SELECT 
    up.user_id,
    a.id,
    'Committed',
    'high',
    'Committed to Reinhardt University',
    NOW(),
    NOW()
FROM athletes a
CROSS JOIN user_profiles up
WHERE a.name ILIKE '%Kavan%Wilson%'
  AND up.school_id = 'f0962bcc-6db5-4210-8447-a541dd18cb72'
  AND NOT EXISTS (
    SELECT 1 FROM college_coach_stars ccs
    WHERE ccs.athlete_id = a.id
      AND ccs.coach_user_id = up.user_id
  )
LIMIT 1;

-- Final verification
SELECT 
    'Final Check' as info,
    a.name,
    a.college,
    ccs.pipeline_stage,
    up.email as coach_email,
    s.name as school_name
FROM athletes a
JOIN college_coach_stars ccs ON ccs.athlete_id = a.id
JOIN user_profiles up ON up.user_id = ccs.coach_user_id
JOIN schools s ON s.id = up.school_id
WHERE a.name ILIKE '%Kavan%Wilson%'
  AND s.id = 'f0962bcc-6db5-4210-8447-a541dd18cb72';

