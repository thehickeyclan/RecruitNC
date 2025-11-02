-- Check RLS policies on college_coach_stars table
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
