-- Make Isabella an admin
-- Run this in Supabase SQL Editor (just copy and paste)

-- Update Isabella to be an admin
UPDATE user_profiles 
SET is_admin = true, updated_at = NOW()
WHERE email = 'isc728@lehigh.edu';

-- Verify it worked
SELECT id, email, full_name, is_admin 
FROM user_profiles 
WHERE email = 'isc728@lehigh.edu';

