-- Associate Blake Rosenbaum with Roanoke College
-- This script finds Blake's user profile and updates it with Roanoke's school_id

-- First, let's see what we have
SELECT 'Current Blake Rosenbaum profile:' as info;
SELECT id, full_name, email, institution, school_id, role
FROM user_profiles
WHERE full_name ILIKE '%blake%rosenbaum%' OR email ILIKE '%blake%rosenbaum%';

SELECT 'Current Roanoke College:' as info;
SELECT id, name, primary_color, secondary_color
FROM schools
WHERE name ILIKE '%roanoke%';

-- Update Blake Rosenbaum's profile to associate with Roanoke College
UPDATE user_profiles
SET 
  school_id = (SELECT id FROM schools WHERE name ILIKE '%roanoke%' LIMIT 1),
  institution = 'Roanoke College',
  role = 'coach',
  updated_at = NOW()
WHERE (full_name ILIKE '%blake%rosenbaum%' OR email ILIKE '%blake%rosenbaum%')
  AND role = 'coach';

-- Verify the update
SELECT 'Updated Blake Rosenbaum profile:' as info;
SELECT 
  up.id,
  up.full_name,
  up.email,
  up.institution,
  up.school_id,
  up.role,
  s.name as school_name,
  s.primary_color,
  s.secondary_color
FROM user_profiles up
LEFT JOIN schools s ON up.school_id = s.id
WHERE up.full_name ILIKE '%blake%rosenbaum%' OR up.email ILIKE '%blake%rosenbaum%';

-- Show all coaches associated with Roanoke
SELECT 'All Roanoke College coaches:' as info;
SELECT 
  up.id,
  up.full_name,
  up.email,
  up.institution,
  s.name as school_name
FROM user_profiles up
JOIN schools s ON up.school_id = s.id
WHERE s.name ILIKE '%roanoke%'
  AND up.role = 'coach';
