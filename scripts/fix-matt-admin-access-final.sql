-- Fix Matt Hickey's admin access for starring athletes
-- This script ensures all admin fields are set correctly

-- First, let's see the current state
SELECT 
  user_id,
  email,
  full_name,
  role,
  is_admin,
  verified_coach,
  verification_status,
  school_id
FROM user_profiles
WHERE email = 'thehickeyclan@gmail.com';

-- Update Matt's profile with all admin permissions
UPDATE user_profiles
SET 
  role = 'admin',
  is_admin = true,
  verified_coach = true,
  verification_status = 'approved',
  school_id = '7332bb01-288a-4033-ad66-e67f73edab4f',
  institution = 'NC United Wrestling',
  updated_at = NOW()
WHERE email = 'thehickeyclan@gmail.com';

-- Verify the update
SELECT 
  user_id,
  email,
  full_name,
  role,
  is_admin,
  verified_coach,
  verification_status,
  school_id,
  institution
FROM user_profiles
WHERE email = 'thehickeyclan@gmail.com';
