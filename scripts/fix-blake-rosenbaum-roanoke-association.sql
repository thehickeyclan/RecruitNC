-- Fix Blake Rosenbaum's association with Roanoke College
-- This script will find Blake, ensure he has the coach role, and link him to Roanoke

-- Step 1: Find Blake Rosenbaum's user profile
SELECT 
  id,
  full_name,
  email,
  role,
  school_id,
  verified_coach,
  institution
FROM user_profiles
WHERE LOWER(full_name) LIKE '%blake%rosenbaum%'
   OR LOWER(email) LIKE '%blake%'
   OR LOWER(email) LIKE '%rosenbaum%';

-- Step 2: Find Roanoke College's ID
-- Removed short_name and type columns that don't exist in schools table
SELECT 
  id,
  name,
  primary_color,
  secondary_color,
  logo_url
FROM schools
WHERE LOWER(name) LIKE '%roanoke%';

-- Step 3: Update Blake Rosenbaum to be associated with Roanoke College
-- Replace the UUIDs below with the actual IDs from steps 1 and 2
DO $$
DECLARE
  blake_user_id UUID;
  roanoke_school_id UUID;
BEGIN
  -- Find Blake's user ID
  SELECT id INTO blake_user_id
  FROM user_profiles
  WHERE LOWER(full_name) LIKE '%blake%rosenbaum%'
  LIMIT 1;

  -- Find Roanoke's school ID
  SELECT id INTO roanoke_school_id
  FROM schools
  WHERE LOWER(name) LIKE '%roanoke%'
  LIMIT 1;

  -- Update Blake's profile if both IDs are found
  IF blake_user_id IS NOT NULL AND roanoke_school_id IS NOT NULL THEN
    UPDATE user_profiles
    SET 
      school_id = roanoke_school_id,
      institution = 'Roanoke College',
      role = 'coach',
      verified_coach = true,
      updated_at = NOW()
    WHERE id = blake_user_id;

    RAISE NOTICE 'Successfully associated Blake Rosenbaum with Roanoke College';
  ELSE
    RAISE NOTICE 'Could not find Blake Rosenbaum or Roanoke College';
  END IF;
END $$;

-- Step 4: Verify the association
-- Removed short_name column that doesn't exist
SELECT 
  up.id,
  up.full_name,
  up.email,
  up.role,
  up.verified_coach,
  up.institution,
  s.name as school_name,
  s.primary_color,
  s.secondary_color
FROM user_profiles up
LEFT JOIN schools s ON up.school_id = s.id
WHERE LOWER(up.full_name) LIKE '%blake%rosenbaum%';

-- Step 5: Show all coaches for Roanoke College
SELECT 
  up.id,
  up.full_name,
  up.email,
  up.role,
  up.verified_coach,
  s.name as school_name
FROM user_profiles up
JOIN schools s ON up.school_id = s.id
WHERE s.name ILIKE '%roanoke%'
  AND up.role = 'coach';

-- Step 6: Show coach counts per school
-- Removed short_name column that doesn't exist
SELECT 
  s.name as school_name,
  COUNT(up.id) as coach_count
FROM schools s
LEFT JOIN user_profiles up ON s.id = up.school_id AND up.role = 'coach'
GROUP BY s.id, s.name
ORDER BY s.name;
