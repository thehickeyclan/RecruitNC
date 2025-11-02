-- Check current RLS policies on college_coach_stars
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'college_coach_stars';

-- Drop the restrictive policy if it exists
DROP POLICY IF EXISTS "Coaches can only see their own stars" ON college_coach_stars;
DROP POLICY IF EXISTS "Users can view their own starred athletes" ON college_coach_stars;
DROP POLICY IF EXISTS "Coaches can view their starred athletes" ON college_coach_stars;

-- Create new policy: Coaches can see all stars from coaches at their school
CREATE POLICY "Coaches can see stars from their school"
ON college_coach_stars
FOR SELECT
USING (
  coach_user_id IN (
    SELECT user_id 
    FROM user_profiles 
    WHERE school_id = (
      SELECT school_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Verify the new policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'college_coach_stars';
