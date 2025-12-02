-- Verify Isabella is an admin
-- Run this in Supabase SQL Editor

SELECT 
  id,
  email,
  full_name,
  is_admin,
  role,
  created_at,
  updated_at
FROM user_profiles 
WHERE email = 'isc728@lehigh.edu';

