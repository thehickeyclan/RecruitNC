-- Connect Colton Palmer to NC United as admin coach

-- First, find Colton Palmer's user_id and NC United's school_id
WITH colton AS (
  SELECT id, email, full_name
  FROM user_profiles
  WHERE LOWER(full_name) LIKE '%colton%palmer%'
     OR LOWER(email) LIKE '%colton%palmer%'
  LIMIT 1
),
nc_united AS (
  SELECT id, name
  FROM schools
  WHERE LOWER(name) = 'nc united wrestling'
  LIMIT 1
)
-- Update Colton Palmer's profile to connect him to NC United
UPDATE user_profiles
SET 
  school_id = (SELECT id FROM nc_united),
  role = 'coach',
  verified_coach = true,
  verification_status = 'approved',
  updated_at = NOW()
WHERE id = (SELECT id FROM colton)
RETURNING 
  id,
  full_name,
  email,
  school_id,
  role,
  verified_coach;

-- Verify the connection
SELECT 
  up.id as user_id,
  up.full_name,
  up.email,
  up.school_id,
  s.name as school_name,
  up.role,
  up.verified_coach,
  CASE 
    WHEN up.school_id = s.id THEN '✓ Successfully connected to NC United'
    ELSE '✗ Connection failed'
  END as status
FROM user_profiles up
LEFT JOIN schools s ON up.school_id = s.id
WHERE LOWER(up.full_name) LIKE '%colton%palmer%'
   OR LOWER(up.email) LIKE '%colton%palmer%';
