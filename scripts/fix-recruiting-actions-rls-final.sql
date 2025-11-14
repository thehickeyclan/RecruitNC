-- Drop existing policies that might be blocking inserts
DROP POLICY IF EXISTS "Coaches can insert activities for athletes at their school" ON recruiting_actions;
DROP POLICY IF EXISTS "Coaches can view activities" ON recruiting_actions;
DROP POLICY IF EXISTS "Coaches can update their activities" ON recruiting_actions;
DROP POLICY IF EXISTS "Coaches can delete their activities" ON recruiting_actions;

-- Allow coaches to insert recruiting activities for any athlete
CREATE POLICY "Coaches can insert recruiting activities"
ON recruiting_actions
FOR INSERT
TO authenticated
WITH CHECK (
  -- The coach_user_id must match the authenticated user
  coach_user_id = auth.uid()
  AND
  -- The user must be a coach (has a user_profile with role='coach')
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'coach'
  )
);

-- Allow coaches to view all recruiting activities for their school
CREATE POLICY "Coaches can view recruiting activities"
ON recruiting_actions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'coach'
  )
);

-- Allow coaches to update their own activities
CREATE POLICY "Coaches can update their recruiting activities"
ON recruiting_actions
FOR UPDATE
TO authenticated
USING (coach_user_id = auth.uid())
WITH CHECK (coach_user_id = auth.uid());

-- Allow coaches to delete their own activities
CREATE POLICY "Coaches can delete their recruiting activities"
ON recruiting_actions
FOR DELETE
TO authenticated
USING (coach_user_id = auth.uid());
