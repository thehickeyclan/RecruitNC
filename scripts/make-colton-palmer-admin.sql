-- Update Colton Palmer to be an admin user
UPDATE user_profiles 
SET is_admin = true, 
    updated_at = NOW()
WHERE 
    (full_name ILIKE '%Colton Palmer%' 
     OR first_name ILIKE '%Colton%' AND last_name ILIKE '%Palmer%'
     OR email ILIKE '%colton%palmer%')
    AND is_admin IS NOT TRUE;

-- Verify the update
SELECT 
    user_id,
    full_name,
    first_name,
    last_name,
    email,
    is_admin,
    role,
    updated_at
FROM user_profiles 
WHERE 
    full_name ILIKE '%Colton Palmer%' 
    OR (first_name ILIKE '%Colton%' AND last_name ILIKE '%Palmer%')
    OR email ILIKE '%colton%palmer%';
