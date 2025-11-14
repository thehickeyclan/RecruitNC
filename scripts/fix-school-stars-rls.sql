-- Drop the existing SELECT policies
DROP POLICY IF EXISTS "Coaches can view their own stars" ON college_coach_stars;
DROP POLICY IF EXISTS "Coaches can see stars from their school" ON college_coach_stars;

-- Create a single, clear SELECT policy that allows coaches to see all stars from their school
CREATE POLICY "Coaches can see all stars from their school"
ON college_coach_stars
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles up1
    INNER JOIN user_profiles up2 ON up1.school_id = up2.school_id
    WHERE up1.user_id = auth.uid()
    AND up2.user_id = college_coach_stars.coach_user_id
    AND up1.school_id IS NOT NULL
  )
);

-- Verify the new policy
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'college_coach_stars' 
AND cmd = 'SELECT';
