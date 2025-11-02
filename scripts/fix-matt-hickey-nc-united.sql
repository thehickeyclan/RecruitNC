-- Fix Matt Hickey's profile to show My Recruits on mobile
-- Sets school_id to NC United and ensures admin/coach access

UPDATE user_profiles
SET 
  school_id = '7332bb01-288a-4033-ad66-e67f73edab4f',
  role = 'admin',
  is_admin = true,
  verified_coach = true,
  institution = 'NC United Wrestling',
  updated_at = NOW()
WHERE email = 'thehickeyclan@gmail.com';

-- Verify the update
SELECT 
  id,
  email,
  full_name,
  role,
  is_admin,
  verified_coach,
  school_id,
  institution
FROM user_profiles
WHERE email = 'thehickeyclan@gmail.com';
