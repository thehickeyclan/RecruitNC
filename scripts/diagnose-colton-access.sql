-- Check Colton Palmer's user profile and school assignment
SELECT 
  up.user_id,
  up.email,
  up.full_name,
  up.school_id,
  up.role,
  up.verified_coach,
  s.name as school_name
FROM user_profiles up
LEFT JOIN schools s ON s.id = up.school_id
WHERE up.email ILIKE '%colton%' OR up.email ILIKE '%palmer%' OR up.full_name ILIKE '%colton%palmer%';

-- Check all coaches at NC United Wrestling
SELECT 
  up.user_id,
  up.email,
  up.full_name,
  up.school_id,
  up.role,
  s.name as school_name,
  COUNT(DISTINCT ccs.athlete_id) as starred_athletes_count
FROM user_profiles up
LEFT JOIN schools s ON s.id = up.school_id
LEFT JOIN college_coach_stars ccs ON ccs.coach_user_id = up.user_id
WHERE s.name = 'NC United Wrestling'
GROUP BY up.user_id, up.email, up.full_name, up.school_id, up.role, s.name;

-- Check if there are multiple school records for NC United
SELECT id, name, created_at
FROM schools
WHERE name ILIKE '%nc%united%';
