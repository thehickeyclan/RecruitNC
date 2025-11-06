-- Debug script to verify Montreat coaches and their school associations

-- 1. Find Montreat's school ID
SELECT id, name 
FROM schools 
WHERE name ILIKE '%montreat%';

-- 2. Find all coaches with Montreat school_id (replace with actual ID from step 1)
-- Example: Replace 'YOUR_MONTREAT_SCHOOL_ID' with the actual UUID from step 1
SELECT 
  up.id,
  up.user_id,
  up.full_name,
  up.email,
  up.school_id,
  up.role,
  up.verified_coach
FROM user_profiles up
WHERE up.school_id = 'YOUR_MONTREAT_SCHOOL_ID';  -- Replace this!

-- 3. Check how many athletes each coach has starred
SELECT 
  up.full_name,
  up.email,
  COUNT(ccs.id) as starred_count
FROM user_profiles up
LEFT JOIN college_coach_stars ccs ON ccs.coach_user_id = up.user_id
WHERE up.school_id = 'YOUR_MONTREAT_SCHOOL_ID'  -- Replace this!
GROUP BY up.id, up.full_name, up.email
ORDER BY up.full_name;

-- 4. List all starred athletes for Montreat coaches with who starred them
SELECT 
  a.name as athlete_name,
  up.full_name as starred_by_coach,
  up.email as coach_email,
  ccs.starred_at,
  ccs.pipeline_stage
FROM college_coach_stars ccs
JOIN athletes a ON a.id = ccs.athlete_id
JOIN user_profiles up ON up.user_id = ccs.coach_user_id
WHERE up.school_id = 'YOUR_MONTREAT_SCHOOL_ID'  -- Replace this!
ORDER BY ccs.starred_at DESC;

