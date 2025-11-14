-- Create test verified coach account for testing coach portal
-- This script will mark the current user as a verified coach

-- First, get the current user's email from auth.users and create/update their profile
INSERT INTO user_profiles (
  id,
  email,
  role,
  verified_coach,
  is_admin,
  institution,
  coaching_position,
  created_at,
  updated_at
)
SELECT 
  auth.uid(),
  auth.email(),
  'college_coach',
  true,
  false,
  'Test University',
  'Head Coach',
  now(),
  now()
ON CONFLICT (id) 
DO UPDATE SET
  role = 'college_coach',
  verified_coach = true,
  institution = 'Test University',
  coaching_position = 'Head Coach',
  updated_at = now();

-- Verify the update worked
SELECT 
  email,
  role,
  verified_coach,
  institution,
  coaching_position
FROM user_profiles 
WHERE id = auth.uid();
