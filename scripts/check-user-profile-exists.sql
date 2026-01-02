-- Check if a specific user profile exists
-- Replace '8dfd328c-d4ee-41e7-98bb-798f15540dbd' with the actual user_id you're trying to update

-- Check by user_id in user_profiles
SELECT 
    user_id,
    email,
    full_name,
    role,
    cell_phone,
    verified_coach,
    school_id,
    is_admin,
    created_at
FROM user_profiles
WHERE user_id = '8dfd328c-d4ee-41e7-98bb-798f15540dbd';

-- Also check in auth.users to see if the user exists there
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE id = '8dfd328c-d4ee-41e7-98bb-798f15540dbd';

-- Check if there are any profiles without matching auth users
SELECT 
    up.user_id,
    up.email,
    up.full_name,
    CASE 
        WHEN au.id IS NULL THEN 'NO AUTH USER'
        ELSE 'HAS AUTH USER'
    END as auth_status
FROM user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE up.user_id = '8dfd328c-d4ee-41e7-98bb-798f15540dbd';

-- Check all user_ids in user_profiles to see the format
SELECT 
    user_id,
    email,
    full_name,
    created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

