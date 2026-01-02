-- Check all columns in user_profiles table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Also check if there are any name-related columns
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
  AND (column_name LIKE '%name%' OR column_name LIKE '%full%' OR column_name LIKE '%first%' OR column_name LIKE '%last%')
ORDER BY column_name;

