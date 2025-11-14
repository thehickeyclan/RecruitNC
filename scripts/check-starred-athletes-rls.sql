-- Check RLS policies on coach_starred_athletes table
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
WHERE tablename = 'coach_starred_athletes'
ORDER BY policyname;
