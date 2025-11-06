-- Debug why athlete dcb9d989-bb76-4084-ab98-c4c3af7a1526 returns 404 on detail page

-- Step 1: Check if the athlete exists
SELECT 
  'Athlete Exists?' as check_type,
  COUNT(*) as count,
  MAX(name) as athlete_name
FROM athletes
WHERE id = 'dcb9d989-bb76-4084-ab98-c4c3af7a1526';

-- Step 2: Check if there are ANY stars for this athlete
SELECT 
  'Star Records for This Athlete' as check_type,
  COUNT(*) as count
FROM college_coach_stars
WHERE athlete_id = 'dcb9d989-bb76-4084-ab98-c4c3af7a1526';

-- Step 3: Show all stars for this athlete with coach info
SELECT 
  ccs.athlete_id,
  ccs.coach_user_id,
  ccs.pipeline_stage,
  ccs.starred_at,
  up.email as coach_email,
  up.school_id,
  s.name as school_name
FROM college_coach_stars ccs
LEFT JOIN user_profiles up ON ccs.coach_user_id = up.user_id
LEFT JOIN schools s ON up.school_id = s.id
WHERE ccs.athlete_id = 'dcb9d989-bb76-4084-ab98-c4c3af7a1526';

-- Step 4: Check RLS policies on college_coach_stars
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'college_coach_stars';

