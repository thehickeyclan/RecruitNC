-- Check Matt Hickey's profile data
SELECT 
  user_id,
  email,
  full_name,
  role,
  is_admin,
  verified_coach,
  school_id,
  institution
FROM user_profiles
WHERE email = 'thehickeyclan@gmail.com';

-- Also check if NC United school exists
SELECT id, name FROM schools WHERE name ILIKE '%NC United%';
