-- Fix Matt Hickey's profile to ensure coach access works on mobile
UPDATE user_profiles
SET 
  role = 'college_coach',
  school_id = (SELECT id FROM schools WHERE name = 'NC United' LIMIT 1),
  full_name = 'Matt Hickey',
  first_name = 'Matt',
  last_name = 'Hickey'
WHERE email = 'thehickeyclan@gmail.com';
