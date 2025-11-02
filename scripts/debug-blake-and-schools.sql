-- Debug script to check Blake Rosenbaum and all schools/coaches

-- 1. Find all users with "blake" in their name or email
SELECT '=== ALL BLAKE USERS ===' as section;
SELECT 
  id,
  full_name,
  email,
  institution,
  school_id,
  role,
  created_at
FROM user_profiles
WHERE 
  full_name ILIKE '%blake%' 
  OR email ILIKE '%blake%'
ORDER BY created_at DESC;

-- 2. Show all schools
SELECT '=== ALL SCHOOLS ===' as section;
SELECT 
  id,
  name,
  primary_color,
  secondary_color,
  created_at
FROM schools
ORDER BY name;

-- 3. Show all coaches with their school assignments
SELECT '=== ALL COACHES WITH SCHOOLS ===' as section;
SELECT 
  up.id as coach_id,
  up.full_name,
  up.email,
  up.institution,
  up.school_id,
  s.name as school_name,
  s.primary_color,
  s.secondary_color
FROM user_profiles up
LEFT JOIN schools s ON up.school_id = s.id
WHERE up.role = 'coach'
ORDER BY s.name NULLS LAST, up.full_name;

-- 4. Count coaches per school
SELECT '=== COACHES PER SCHOOL ===' as section;
SELECT 
  s.name as school_name,
  s.id as school_id,
  COUNT(up.id) as coach_count,
  STRING_AGG(up.full_name, ', ') as coaches
FROM schools s
LEFT JOIN user_profiles up ON up.school_id = s.id AND up.role = 'coach'
GROUP BY s.id, s.name
ORDER BY s.name;

-- 5. Show coaches without school assignment
SELECT '=== COACHES WITHOUT SCHOOL ===' as section;
SELECT 
  id,
  full_name,
  email,
  institution,
  role
FROM user_profiles
WHERE role = 'coach' AND school_id IS NULL
ORDER BY full_name;
