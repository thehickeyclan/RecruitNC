-- Check if your profile (thehickeyclan@gmail.com) is correctly assigned to NC United
SELECT 
  up.email,
  up.full_name,
  up.school_id as your_school_id,
  s.id as nc_united_school_id,
  s.name as school_name,
  CASE 
    WHEN up.school_id = s.id THEN '✓ MATCH - You are correctly assigned to NC United'
    WHEN up.school_id IS NULL THEN '✗ ERROR - Your profile has no school_id set'
    ELSE '✗ ERROR - Your school_id does not match NC United'
  END as verification_status
FROM user_profiles up
CROSS JOIN schools s
WHERE up.email = 'thehickeyclan@gmail.com'
  AND s.name = 'NC United Wrestling';

-- Show all your starred athletes
SELECT 
  a.name as athlete_name,
  ccs.pipeline_stage,
  ccs.interest_level,
  ccs.created_at as starred_at
FROM college_coach_stars ccs
JOIN athletes a ON a.id = ccs.athlete_id
JOIN user_profiles up ON up.user_id = ccs.coach_user_id
WHERE up.email = 'thehickeyclan@gmail.com'
ORDER BY ccs.created_at DESC;
