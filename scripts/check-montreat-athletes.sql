-- Check which athletes are starred for Montreat and by whom

-- Get all starred athletes for Montreat coaches
SELECT 
  up.full_name as coach_name,
  up.email as coach_email,
  up.user_id as coach_user_id,
  a.name as athlete_name,
  a.id as athlete_id,
  ccs.pipeline_stage,
  ccs.starred_at
FROM user_profiles up
JOIN college_coach_stars ccs ON ccs.coach_user_id = up.user_id
JOIN athletes a ON a.id = ccs.athlete_id
WHERE up.school_id = '8a071081-6b9b-4811-8154-bf38d1900f44'
ORDER BY ccs.starred_at DESC;

-- Also count by coach
SELECT 
  up.full_name as coach_name,
  up.email as coach_email,
  COUNT(ccs.id) as athlete_count
FROM user_profiles up
LEFT JOIN college_coach_stars ccs ON ccs.coach_user_id = up.user_id
WHERE up.school_id = '8a071081-6b9b-4811-8154-bf38d1900f44'
GROUP BY up.id, up.full_name, up.email
ORDER BY up.full_name;
