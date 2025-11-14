-- Verify Blake Rosenbaum's profile is correctly set up for Roanoke College

-- 1. Find Roanoke College and its ID
SELECT 
  id as roanoke_school_id,
  name,
  logo_url,
  primary_color,
  secondary_color
FROM schools
WHERE name ILIKE '%roanoke%';

-- 2. Find Blake Rosenbaum's user profile
SELECT 
  id as profile_id,
  user_id,
  email,
  full_name,
  school_id,
  role
FROM user_profiles
WHERE email ILIKE '%rosenbaum%' OR full_name ILIKE '%rosenbaum%';

-- 3. Verify the connection - show if Blake's school_id matches Roanoke's ID
SELECT 
  up.email,
  up.full_name,
  up.school_id as blake_school_id,
  s.id as roanoke_school_id,
  s.name as school_name,
  CASE 
    WHEN up.school_id = s.id THEN '✓ MATCH - Blake is correctly assigned to Roanoke'
    WHEN up.school_id IS NULL THEN '✗ ERROR - Blake has no school_id assigned'
    ELSE '✗ ERROR - Blake is assigned to a different school'
  END as verification_status
FROM user_profiles up
LEFT JOIN schools s ON s.name ILIKE '%roanoke%'
WHERE up.email ILIKE '%rosenbaum%' OR up.full_name ILIKE '%rosenbaum%';
