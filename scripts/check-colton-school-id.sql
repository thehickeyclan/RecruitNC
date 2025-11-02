-- Check Colton Palmer's user profile and school_id
SELECT 
  up.user_id,
  up.email,
  up.full_name,
  up.school_id,
  up.verified_coach,
  up.role,
  s.name as school_name
FROM user_profiles up
LEFT JOIN schools s ON s.id = up.school_id
WHERE up.email ILIKE '%colton%' OR up.full_name ILIKE '%colton%palmer%';

-- Check all coaches at NC United school
SELECT 
  up.user_id,
  up.email,
  up.full_name,
  up.school_id,
  s.name as school_name
FROM user_profiles up
LEFT JOIN schools s ON s.id = up.school_id
WHERE s.name ILIKE '%NC United%' OR s.name ILIKE '%NC Wrestling%';

-- Check if there are starred athletes for NC United school
SELECT 
  COUNT(DISTINCT ccs.athlete_id) as total_starred_athletes,
  COUNT(DISTINCT ccs.coach_user_id) as total_coaches_with_stars,
  s.name as school_name
FROM college_coach_stars ccs
JOIN user_profiles up ON up.user_id = ccs.coach_user_id
JOIN schools s ON s.id = up.school_id
WHERE s.name ILIKE '%NC United%' OR s.name ILIKE '%NC Wrestling%'
GROUP BY s.name;
