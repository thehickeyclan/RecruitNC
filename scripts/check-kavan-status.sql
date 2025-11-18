-- Quick diagnostic: Check what's actually in the database

-- 1. Is Kavan in the database?
SELECT 'Kavan Wilson Info' as check_type, id, name, college, recruiting_status 
FROM athletes 
WHERE name ILIKE '%Kavan%Wilson%';

-- 2. Does Reinhardt exist?
SELECT 'Reinhardt School' as check_type, id, name 
FROM schools 
WHERE name ILIKE '%Reinhardt%';

-- 3. Are there ANY coaches for Reinhardt?
SELECT 'Reinhardt Coaches' as check_type, up.user_id, up.email, up.verified_coach, s.name as school_name
FROM user_profiles up
JOIN schools s ON s.id = up.school_id
WHERE s.name ILIKE '%Reinhardt%';

-- 4. Does Kavan have ANY star entries?
SELECT 'Kavan Star Entries' as check_type, 
  ccs.id, 
  ccs.coach_user_id, 
  ccs.pipeline_stage,
  up.email as coach_email,
  s.name as coach_school
FROM college_coach_stars ccs
JOIN athletes a ON a.id = ccs.athlete_id
LEFT JOIN user_profiles up ON up.user_id = ccs.coach_user_id
LEFT JOIN schools s ON s.id = up.school_id
WHERE a.name ILIKE '%Kavan%Wilson%';

-- 5. What would the portal API see? (coaches from Reinhardt and their stars)
SELECT 'Portal View' as check_type,
  a.name as athlete_name,
  ccs.pipeline_stage,
  up.email as coach_email,
  s.name as school_name
FROM college_coach_stars ccs
JOIN athletes a ON a.id = ccs.athlete_id
JOIN user_profiles up ON up.user_id = ccs.coach_user_id
JOIN schools s ON s.id = up.school_id
WHERE s.name ILIKE '%Reinhardt%'
  AND a.name ILIKE '%Kavan%Wilson%';

