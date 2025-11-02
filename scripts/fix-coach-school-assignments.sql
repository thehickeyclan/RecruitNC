-- Check current coach assignments
SELECT 
  up.id,
  up.full_name,
  up.email,
  up.institution,
  up.school_id,
  s.name as school_name
FROM user_profiles up
LEFT JOIN schools s ON up.school_id = s.id
WHERE up.verified_coach = true OR up.role = 'coach'
ORDER BY up.full_name;

-- Get school IDs
SELECT id, name FROM schools ORDER BY name;

-- Update Blake Rosenbaum to Roanoke College
UPDATE user_profiles
SET school_id = (SELECT id FROM schools WHERE name = 'Roanoke College')
WHERE full_name ILIKE '%Blake%Rosenbaum%' OR email ILIKE '%blake%rosenbaum%';

-- Update Hampton to Emory & Henry College  
UPDATE user_profiles
SET school_id = (SELECT id FROM schools WHERE name = 'Emory & Henry College')
WHERE institution ILIKE '%Emory%Henry%' OR institution ILIKE '%E&H%';

-- Verify the updates
SELECT 
  up.id,
  up.full_name,
  up.email,
  up.institution,
  s.name as assigned_school
FROM user_profiles up
LEFT JOIN schools s ON up.school_id = s.id
WHERE up.verified_coach = true OR up.role = 'coach'
ORDER BY up.full_name;
