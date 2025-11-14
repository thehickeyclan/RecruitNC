-- Check current RLS policies on recruiting_actions
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'recruiting_actions';

-- Drop existing restrictive INSERT policies if any
DROP POLICY IF EXISTS "Coaches can only insert their own actions" ON recruiting_actions;
DROP POLICY IF EXISTS "Users can insert their own actions" ON recruiting_actions;

-- Create new INSERT policy that allows coaches to insert actions for athletes at their school
CREATE POLICY "Coaches can insert actions for their school athletes"
ON recruiting_actions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_profiles up1
    JOIN user_profiles up2 ON up1.school_id = up2.school_id
    WHERE up1.user_id = auth.uid()
      AND up2.user_id = recruiting_actions.coach_user_id
      AND up1.school_id IS NOT NULL
  )
);

-- Verify the new policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'recruiting_actions'
  AND cmd = 'INSERT';
