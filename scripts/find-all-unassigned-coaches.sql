-- Find all coaches without school assignments
-- This helps identify which coaches need to be associated with schools

SELECT 
  id,
  full_name,
  email,
  role,
  institution,
  verified_coach,
  created_at
FROM user_profiles
WHERE role = 'coach'
  AND (school_id IS NULL OR institution IS NULL)
ORDER BY full_name;

-- Show all available schools for assignment
SELECT 
  id,
  name,
  short_name,
  type,
  division,
  primary_color,
  secondary_color
FROM schools
ORDER BY name;

-- Template for associating coaches with schools
-- Replace the email and school name with actual values
/*
UPDATE user_profiles
SET 
  school_id = (SELECT id FROM schools WHERE name = 'SCHOOL_NAME_HERE'),
  institution = 'SCHOOL_NAME_HERE',
  verified_coach = true,
  updated_at = NOW()
WHERE email = 'COACH_EMAIL_HERE';
*/
