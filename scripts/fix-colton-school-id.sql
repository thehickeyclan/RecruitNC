-- Find Colton Palmer's user profile
SELECT 
  user_id,
  email,
  full_name,
  school_id,
  institution,
  role
FROM user_profiles
WHERE email ILIKE '%colton%palmer%' OR full_name ILIKE '%colton%palmer%';

-- Find the NC United Wrestling school_id
SELECT 
  id as school_id,
  name,
  city,
  state
FROM schools
WHERE name ILIKE '%NC United%' OR name ILIKE '%NC Wrestling United%';

-- After running the above queries, update Colton's school_id to match NC United
-- Replace 'COLTON_USER_ID' with Colton's actual user_id from first query
-- Replace 'NC_UNITED_SCHOOL_ID' with the school_id from second query
-- UPDATE user_profiles 
-- SET school_id = 'NC_UNITED_SCHOOL_ID'
-- WHERE user_id = 'COLTON_USER_ID';

-- Verify both coaches are now at the same school
SELECT 
  up.user_id,
  up.email,
  up.full_name,
  up.school_id,
  s.name as school_name,
  COUNT(ccs.athlete_id) as starred_athletes_count
FROM user_profiles up
LEFT JOIN schools s ON up.school_id = s.id
LEFT JOIN college_coach_stars ccs ON up.user_id = ccs.coach_user_id
WHERE up.school_id IN (
  SELECT school_id FROM user_profiles WHERE email ILIKE '%colton%palmer%' OR full_name ILIKE '%colton%palmer%'
)
GROUP BY up.user_id, up.email, up.full_name, up.school_id, s.name;
