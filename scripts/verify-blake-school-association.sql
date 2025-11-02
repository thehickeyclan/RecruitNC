-- Verify Blake Rosenbaum's school association
-- This script checks if Blake is properly linked to Roanoke College

-- 1. Find Blake Rosenbaum
SELECT 
  id,
  full_name,
  email,
  role,
  institution,
  school_id,
  created_at
FROM user_profiles
WHERE LOWER(full_name) LIKE '%blake%rosenbaum%'
OR LOWER(email) LIKE '%blake%rosenbaum%';

-- 2. Find Roanoke College
SELECT 
  id,
  name,
  logo_url,
  primary_color,
  secondary_color
FROM schools
WHERE LOWER(name) LIKE '%roanoke%';

-- 3. Count coaches per school
SELECT 
  s.id as school_id,
  s.name as school_name,
  COUNT(up.id) as coach_count,
  STRING_AGG(up.full_name, ', ') as coach_names
FROM schools s
LEFT JOIN user_profiles up ON up.school_id = s.id
WHERE up.role IN ('coach', 'college_coach')
GROUP BY s.id, s.name
ORDER BY s.name;

-- 4. Show all coaches with their schools
SELECT 
  up.id,
  up.full_name,
  up.email,
  up.role,
  up.school_id,
  s.name as school_name
FROM user_profiles up
LEFT JOIN schools s ON s.id = up.school_id
WHERE up.role IN ('coach', 'college_coach')
ORDER BY s.name, up.full_name;

-- 5. If Blake needs to be linked to Roanoke, run this:
-- UPDATE user_profiles
-- SET school_id = (SELECT id FROM schools WHERE LOWER(name) LIKE '%roanoke%' LIMIT 1),
--     institution = 'Roanoke College',
--     role = 'college_coach'
-- WHERE LOWER(full_name) LIKE '%blake%rosenbaum%'
-- RETURNING id, full_name, email, role, school_id, institution;
