-- Check if college_coach_stars table exists and its schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'college_coach_stars'
ORDER BY ordinal_position;

-- Check RLS policies on college_coach_stars
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'college_coach_stars'
ORDER BY policyname;

-- Check if table has RLS enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'college_coach_stars';
