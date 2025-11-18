-- Diagnostic script to check Kavan Wilson's status
-- Run this to see exactly what's in the database

-- 1. Check if Kavan Wilson exists and his commitment status
SELECT 
    '=== ATHLETE INFO ===' as section,
    id,
    name,
    college,
    recruiting_status,
    graduationyear
FROM athletes
WHERE name ILIKE '%Kavan%Wilson%'
   OR name ILIKE '%Kavan Wilson%';

-- 2. Check if Reinhardt University exists in schools
SELECT 
    '=== SCHOOL INFO ===' as section,
    id,
    name
FROM schools
WHERE name ILIKE '%Reinhardt%';

-- 3. Check if there are any coaches for Reinhardt
SELECT 
    '=== REINHARDT COACHES ===' as section,
    up.user_id,
    up.email,
    up.first_name,
    up.last_name,
    s.name as school_name
FROM user_profiles up
JOIN schools s ON s.id = up.school_id
WHERE s.name ILIKE '%Reinhardt%';

-- 4. Check if Kavan has ANY star entries
SELECT 
    '=== ALL STAR ENTRIES FOR KAVAN ===' as section,
    ccs.id,
    ccs.coach_user_id,
    ccs.athlete_id,
    ccs.pipeline_stage,
    ccs.interest_level,
    ccs.committed_date,
    ccs.starred_at,
    ccs.notes,
    up.email as coach_email,
    s.name as coach_school
FROM college_coach_stars ccs
LEFT JOIN user_profiles up ON up.user_id = ccs.coach_user_id
LEFT JOIN schools s ON s.id = up.school_id
WHERE ccs.athlete_id IN (
    SELECT id FROM athletes WHERE name ILIKE '%Kavan%Wilson%' OR name ILIKE '%Kavan Wilson%'
);

-- 5. Check what the portal API would see (coaches for Reinhardt and their stars)
SELECT 
    '=== PORTAL VIEW (Reinhardt coaches stars) ===' as section,
    a.name as athlete_name,
    a.college,
    a.recruiting_status,
    ccs.pipeline_stage,
    ccs.coach_user_id,
    up.email as coach_email,
    s.name as school_name
FROM college_coach_stars ccs
JOIN athletes a ON a.id = ccs.athlete_id
JOIN user_profiles up ON up.user_id = ccs.coach_user_id
JOIN schools s ON s.id = up.school_id
WHERE s.name ILIKE '%Reinhardt%'
  AND ccs.pipeline_stage IN ('Committed', 'Signed', 'committed', 'signed')
ORDER BY a.name;

-- 6. Check if Kavan's college field matches Reinhardt
SELECT 
    '=== COLLEGE MATCH CHECK ===' as section,
    a.name,
    a.college as athlete_college,
    s.name as school_name,
    CASE 
        WHEN a.college ILIKE '%' || s.name || '%' THEN 'MATCHES'
        WHEN s.name ILIKE '%' || a.college || '%' THEN 'MATCHES'
        WHEN a.college ILIKE '%Reinhardt%' AND s.name ILIKE '%Reinhardt%' THEN 'BOTH HAVE REINHARDT'
        ELSE 'NO MATCH'
    END as match_status
FROM athletes a
CROSS JOIN schools s
WHERE a.name ILIKE '%Kavan%Wilson%' OR a.name ILIKE '%Kavan Wilson%'
  AND s.name ILIKE '%Reinhardt%';




