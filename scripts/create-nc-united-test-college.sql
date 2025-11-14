-- Create NC United as a test college with logo and brand colors
INSERT INTO schools (id, name, logo_url, primary_color, secondary_color, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'NC United',
  '/nc-united-logo.png',
  '#1B2E59', -- Navy blue (primary)
  '#C8102E', -- Red (secondary)
  NOW(),
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  updated_at = NOW()
RETURNING id;

-- Assign thehickeyclan@gmail.com as coach for NC United
-- First, get the school_id and user_id
WITH school_data AS (
  SELECT id FROM schools WHERE name = 'NC United'
),
user_data AS (
  SELECT id FROM user_profiles WHERE email = 'thehickeyclan@gmail.com'
)
INSERT INTO user_profiles (id, email, role, school_id, created_at, updated_at)
SELECT 
  user_data.id,
  'thehickeyclan@gmail.com',
  'coach',
  school_data.id,
  NOW(),
  NOW()
FROM school_data, user_data
ON CONFLICT (email) DO UPDATE SET
  school_id = EXCLUDED.school_id,
  role = 'coach',
  updated_at = NOW();
