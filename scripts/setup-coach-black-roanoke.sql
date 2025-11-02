-- Setup Coach Black and associate with Roanoke College
-- This script demonstrates the complete coach-to-school association flow

-- Step 1: Ensure Roanoke College exists in schools table
INSERT INTO schools (
  id,
  name,
  logo_url,
  primary_color,
  secondary_color,
  created_at,
  updated_at
)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Roanoke College',
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-poQEWNcWEoIoHCVoaOLdfOBhpub0OC.png',
  '#8B1538',  -- Maroon
  '#000000',  -- Black
  NOW(),
  NOW()
)
ON CONFLICT (name) 
DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  updated_at = NOW();

-- Step 2: Find or create Coach Black in auth.users and user_profiles
DO $$
DECLARE
  coach_black_user_id uuid;
  roanoke_school_id uuid;
BEGIN
  -- Get Roanoke College ID
  SELECT id INTO roanoke_school_id
  FROM schools
  WHERE name = 'Roanoke College'
  LIMIT 1;

  IF roanoke_school_id IS NULL THEN
    RAISE EXCEPTION 'Roanoke College not found in schools table';
  END IF;

  RAISE NOTICE 'Roanoke College ID: %', roanoke_school_id;

  -- Try to find Coach Black by email or name
  SELECT user_id INTO coach_black_user_id
  FROM user_profiles
  WHERE 
    LOWER(full_name) LIKE '%black%' 
    OR LOWER(email) LIKE '%black%'
    OR LOWER(last_name) = 'black'
  LIMIT 1;

  IF coach_black_user_id IS NULL THEN
    -- If Coach Black doesn't exist, we'll create a placeholder profile
    -- In production, this would be created when the coach signs up
    RAISE NOTICE 'Coach Black not found. Creating placeholder profile...';
    
    -- Create a test user in auth.users (this requires service role access)
    -- For demonstration, we'll create the profile entry directly
    INSERT INTO user_profiles (
      user_id,
      email,
      full_name,
      first_name,
      last_name,
      role,
      profile_type,
      verified_coach,
      verification_status,
      institution,
      coaching_position,
      school_id,
      created_at,
      updated_at,
      verified_at
    )
    VALUES (
      gen_random_uuid(),  -- Generate a new UUID for the coach
      'coach.black@roanoke.edu',
      'Coach Black',
      'Coach',
      'Black',
      'coach',
      'college-coach',
      true,  -- Pre-approved for demonstration
      'approved',
      'Roanoke College',
      'Head Wrestling Coach',
      roanoke_school_id,  -- Associate with Roanoke College
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (email) 
    DO UPDATE SET
      role = 'coach',
      verified_coach = true,
      verification_status = 'approved',
      school_id = roanoke_school_id,
      institution = 'Roanoke College',
      updated_at = NOW();

    RAISE NOTICE 'Coach Black profile created and associated with Roanoke College';
  ELSE
    -- Coach Black exists, update their profile
    RAISE NOTICE 'Found Coach Black with user_id: %', coach_black_user_id;
    
    UPDATE user_profiles
    SET
      role = 'coach',
      profile_type = 'college-coach',
      verified_coach = true,
      verification_status = 'approved',
      institution = 'Roanoke College',
      coaching_position = COALESCE(coaching_position, 'Head Wrestling Coach'),
      school_id = roanoke_school_id,  -- Associate with Roanoke College
      verified_at = COALESCE(verified_at, NOW()),
      updated_at = NOW()
    WHERE user_id = coach_black_user_id;

    RAISE NOTICE 'Coach Black updated and associated with Roanoke College';
  END IF;
END $$;

-- Step 3: Verify the association
SELECT 
  up.id,
  up.user_id,
  up.email,
  up.full_name,
  up.role,
  up.verified_coach,
  up.verification_status,
  up.institution,
  up.coaching_position,
  up.school_id,
  s.name as school_name,
  s.primary_color,
  s.secondary_color
FROM user_profiles up
LEFT JOIN schools s ON up.school_id = s.id
WHERE 
  LOWER(up.full_name) LIKE '%black%' 
  OR LOWER(up.email) LIKE '%black%'
  OR LOWER(up.last_name) = 'black';

-- Step 4: Show all coaches associated with Roanoke College
SELECT 
  up.id,
  up.email,
  up.full_name,
  up.role,
  up.verified_coach,
  up.institution,
  up.coaching_position,
  s.name as school_name
FROM user_profiles up
INNER JOIN schools s ON up.school_id = s.id
WHERE s.name = 'Roanoke College'
ORDER BY up.full_name;
