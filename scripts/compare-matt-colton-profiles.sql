-- Compare Matt Hickey and Colton Palmer profiles to see why Colton shows up but Matt doesn't

SELECT 
  id,
  email,
  full_name,
  role,
  is_admin,
  verified_coach,
  school_id,
  created_at,
  updated_at
FROM user_profiles
WHERE email IN ('thehickeyclan@gmail.com', 'cpalmer@goldgroupinc.com')
ORDER BY email;

-- Also check if there are any other fields that might be different
SELECT *
FROM user_profiles
WHERE email IN ('thehickeyclan@gmail.com', 'cpalmer@goldgroupinc.com')
ORDER BY email;
