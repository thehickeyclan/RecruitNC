-- Diagnostic script to check and fix Matt Hickey's profile user_id mismatch

-- Step 1: Check auth user ID
SELECT 
  'Auth User' as source,
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'thehickeyclan@gmail.com';

-- Step 2: Check profile user_id
SELECT 
  'Profile' as source,
  user_id,
  email,
  role,
  is_admin,
  school_id,
  created_at
FROM user_profiles
WHERE email = 'thehickeyclan@gmail.com';

-- Step 3: Fix the mismatch by updating profile user_id to match auth user id
UPDATE user_profiles
SET user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'thehickeyclan@gmail.com'
)
WHERE email = 'thehickeyclan@gmail.com'
AND user_id != (
  SELECT id 
  FROM auth.users 
  WHERE email = 'thehickeyclan@gmail.com'
);

-- Step 4: Verify the fix
SELECT 
  'After Fix' as status,
  up.user_id as profile_user_id,
  au.id as auth_user_id,
  CASE 
    WHEN up.user_id = au.id THEN '✓ MATCH'
    ELSE '✗ MISMATCH'
  END as match_status,
  up.email,
  up.role,
  up.is_admin
FROM user_profiles up
JOIN auth.users au ON au.email = up.email
WHERE up.email = 'thehickeyclan@gmail.com';
