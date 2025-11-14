-- Give Colton Palmer admin access and verified coach status
-- Added school_id and institution to link Colton to NC United like Matt
UPDATE user_profiles 
SET 
    is_admin = true,
    verified_coach = true,
    role = 'admin',
    verification_status = 'approved',
    school_id = '7332bb01-288a-4033-ad66-e67f73edab4f',
    institution = 'NC United Wrestling',
    updated_at = NOW()
WHERE 
    (full_name ILIKE '%Colton Palmer%' 
     OR (first_name ILIKE '%Colton%' AND last_name ILIKE '%Palmer%')
     OR email ILIKE '%colton%palmer%');

-- Verify the update
-- Added school_id and institution to verification query
SELECT 
    user_id,
    full_name,
    email,
    is_admin,
    verified_coach,
    role,
    verification_status,
    school_id,
    institution,
    updated_at
FROM user_profiles 
WHERE 
    full_name ILIKE '%Colton Palmer%' 
    OR (first_name ILIKE '%Colton%' AND last_name ILIKE '%Palmer%')
    OR email ILIKE '%colton%palmer%';
