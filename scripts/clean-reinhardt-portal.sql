-- Clean up Reinhardt portal: Remove all star entries except for athletes committed to Reinhardt

-- Delete all star entries for Reinhardt coaches where the athlete is NOT committed to Reinhardt
DELETE FROM college_coach_stars
WHERE id IN (
    SELECT ccs.id
    FROM college_coach_stars ccs
    JOIN athletes a ON a.id = ccs.athlete_id
    JOIN user_profiles up ON up.user_id = ccs.coach_user_id
    JOIN schools s ON s.id = up.school_id
    WHERE s.id = 'f0962bcc-6db5-4210-8447-a541dd18cb72'
      AND (
        a.college IS NULL 
        OR a.college = ''
        OR a.college NOT ILIKE '%Reinhardt%'
      )
);

-- Verify: Show what's left in Reinhardt portal
SELECT 
    'Reinhardt Portal Contents' as info,
    a.name,
    a.college,
    a.recruiting_status,
    ccs.pipeline_stage,
    up.email as coach_email
FROM college_coach_stars ccs
JOIN athletes a ON a.id = ccs.athlete_id
JOIN user_profiles up ON up.user_id = ccs.coach_user_id
JOIN schools s ON s.id = up.school_id
WHERE s.id = 'f0962bcc-6db5-4210-8447-a541dd18cb72'
ORDER BY a.name;

