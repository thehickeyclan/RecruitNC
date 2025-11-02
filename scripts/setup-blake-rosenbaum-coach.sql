-- Find Blake Rosenbaum in auth.users and create/update his user_profile
-- Set his role to college_coach

-- First, let's find his user_id from auth.users
DO $$
DECLARE
  blake_user_id uuid;
BEGIN
  -- Find Blake's user_id from auth.users by email
  SELECT id INTO blake_user_id
  FROM auth.users
  WHERE email ILIKE '%blake%rosenbaum%' OR email ILIKE '%rosenbaum%blake%'
  LIMIT 1;

  IF blake_user_id IS NULL THEN
    RAISE NOTICE 'Blake Rosenbaum not found in auth.users. Please check the email address.';
  ELSE
    RAISE NOTICE 'Found Blake Rosenbaum with user_id: %', blake_user_id;
    
    -- Insert or update user_profile
    INSERT INTO user_profiles (
      user_id,
      email,
      role,
      full_name,
      created_at,
      updated_at
    )
    VALUES (
      blake_user_id,
      (SELECT email FROM auth.users WHERE id = blake_user_id),
      'college_coach',
      'Blake Rosenbaum',
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      role = 'college_coach',
      full_name = COALESCE(user_profiles.full_name, 'Blake Rosenbaum'),
      updated_at = NOW();
    
    RAISE NOTICE 'Blake Rosenbaum profile created/updated with role: college_coach';
  END IF;
END $$;

-- Verify the update
SELECT 
  user_id,
  email,
  full_name,
  role,
  created_at
FROM user_profiles
WHERE email ILIKE '%rosenbaum%';
