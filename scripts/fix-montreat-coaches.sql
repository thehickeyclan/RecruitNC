-- Fix Montreat coaches' school_id assignment

-- Montreat College ID: 8a071081-6b9b-4811-8154-bf38d1900f44

-- Update Jim Connaghan
UPDATE user_profiles
SET 
  school_id = '8a071081-6b9b-4811-8154-bf38d1900f44',
  role = 'college_coach',
  verified_coach = true,
  updated_at = NOW()
WHERE email = 'james.connaghan@montreat.edu';

-- Update Jacob Power
UPDATE user_profiles
SET 
  school_id = '8a071081-6b9b-4811-8154-bf38d1900f44',
  role = 'college_coach',
  verified_coach = true,
  updated_at = NOW()
WHERE email = 'jacob.power@montreat.edu';

-- Verify the update
SELECT 
  full_name,
  email,
  school_id,
  role,
  verified_coach
FROM user_profiles
WHERE email IN ('james.connaghan@montreat.edu', 'jacob.power@montreat.edu');

