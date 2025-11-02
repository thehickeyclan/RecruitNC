-- Verify and fix Matt Hickey's profile for admin and coach access

-- First, check current profile state
SELECT 
  user_id,
  full_name,
  email,
  role,
  is_admin,
  verified_coach,
  verification_status,
  school_id,
  institution
FROM user_profiles
WHERE email = 'matt@goldgroupinc.com';

-- Update Matt's profile to ensure all admin and coach flags are set
UPDATE user_profiles
SET 
  role = 'admin',
  is_admin = true,
  verified_coach = true,
  verification_status = 'approved',
  school_id = '7332bb01-288a-4033-ad66-e67f73edab4f',
  institution = 'NC United Wrestling',
  updated_at = NOW()
WHERE email = 'matt@goldgroupinc.com';

-- Verify the update
SELECT 
  user_id,
  full_name,
  email,
  role,
  is_admin,
  verified_coach,
  verification_status,
  school_id,
  institution,
  updated_at
FROM user_profiles
WHERE email = 'matt@goldgroupinc.com';
