-- Check all current RLS policies on college_coach_stars

SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'college_coach_stars'
ORDER BY cmd, policyname;
