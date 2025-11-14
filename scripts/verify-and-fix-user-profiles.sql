-- First, let's see what data we have
SELECT 
  COUNT(*) as total_profiles,
  COUNT(role) as profiles_with_role,
  COUNT(profile_type) as profiles_with_profile_type,
  COUNT(cell_phone) as profiles_with_cell_phone
FROM user_profiles;

-- Copy profile_type to role where role is null
UPDATE user_profiles
SET role = profile_type
WHERE role IS NULL AND profile_type IS NOT NULL;

-- Verify the update
SELECT 
  role,
  COUNT(*) as count
FROM user_profiles
GROUP BY role
ORDER BY count DESC;

-- Show sample of updated profiles
SELECT 
  full_name,
  email,
  role,
  profile_type,
  cell_phone,
  created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;
