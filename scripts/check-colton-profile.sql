-- Check Colton Palmer's profile and school_id
SELECT 
  up.user_id,
  up.full_name,
  up.email,
  up.school_id,
  up.role,
  CASE 
    WHEN up.school_id = '7332bb01-288a-4033-ad66-e67f73edab4f' THEN 'CORRECT'
    WHEN up.school_id IS NULL THEN 'MISSING'
    ELSE 'WRONG SCHOOL'
  END as school_id_status
FROM user_profiles up
WHERE up.email = 'cpalmer@goldgroupinc.com';

-- Get all coaches at NC United Wrestling
SELECT 
  up.user_id,
  up.full_name,
  up.email,
  up.school_id,
  COUNT(ccs.id) as starred_athletes_count
FROM user_profiles up
LEFT JOIN college_coach_stars ccs ON ccs.coach_user_id = up.user_id
WHERE up.school_id = '7332bb01-288a-4033-ad66-e67f73edab4f'
GROUP BY up.user_id, up.full_name, up.email, up.school_id
ORDER BY up.full_name;

-- Check if there are any starred athletes for NC United coaches
SELECT 
  ccs.coach_user_id,
  up.full_name as coach_name,
  up.email as coach_email,
  COUNT(ccs.id) as total_stars
FROM college_coach_stars ccs
JOIN user_profiles up ON up.user_id = ccs.coach_user_id
WHERE up.school_id = '7332bb01-288a-4033-ad66-e67f73edab4f'
GROUP BY ccs.coach_user_id, up.full_name, up.email;
