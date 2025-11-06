-- Find coaches that should belong to Montreat but don't have school_id set

-- 1. Search for any users with "montreat" in their email or name
SELECT 
  id,
  user_id,
  full_name,
  email,
  school_id,
  role,
  verified_coach,
  institution
FROM user_profiles
WHERE 
  email ILIKE '%montreat%' 
  OR full_name ILIKE '%montreat%'
  OR institution ILIKE '%montreat%'
ORDER BY created_at DESC;

-- 2. Also check if there are any coaches without a school_id
SELECT 
  id,
  user_id,
  full_name,
  email,
  school_id,
  role,
  verified_coach,
  institution
FROM user_profiles
WHERE 
  (role = 'coach' OR role = 'college_coach')
  AND school_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

