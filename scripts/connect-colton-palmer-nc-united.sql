-- Connect Colton Palmer to NC United as a coach
-- This script updates Colton Palmer's user_profile to link him to NC United

-- First, let's find Colton Palmer's user_profile
DO $$
DECLARE
  colton_user_id UUID;
  nc_united_school_id UUID;
BEGIN
  -- Find Colton Palmer's user ID (search by email or name)
  SELECT id INTO colton_user_id
  FROM user_profiles
  WHERE LOWER(email) LIKE '%colton%palmer%'
     OR LOWER(full_name) LIKE '%colton%palmer%'
  LIMIT 1;

  -- Find NC United's school ID
  SELECT id INTO nc_united_school_id
  FROM schools
  WHERE LOWER(name) LIKE '%nc united%'
  LIMIT 1;

  -- Log what we found
  RAISE NOTICE 'Colton Palmer user_id: %', colton_user_id;
  RAISE NOTICE 'NC United school_id: %', nc_united_school_id;

  -- Update Colton Palmer's profile if both IDs were found
  IF colton_user_id IS NOT NULL AND nc_united_school_id IS NOT NULL THEN
    UPDATE user_profiles
    SET 
      school_id = nc_united_school_id,
      role = 'college_coach',
      institution = 'NC United',
      updated_at = NOW()
    WHERE id = colton_user_id;

    RAISE NOTICE 'Successfully connected Colton Palmer to NC United!';
  ELSE
    RAISE NOTICE 'Could not find Colton Palmer or NC United. Please check the names.';
  END IF;
END $$;

-- Verify the update
SELECT 
  up.full_name,
  up.email,
  up.role,
  up.institution,
  s.name as school_name
FROM user_profiles up
LEFT JOIN schools s ON up.school_id = s.id
WHERE LOWER(up.email) LIKE '%colton%palmer%'
   OR LOWER(up.full_name) LIKE '%colton%palmer%';
