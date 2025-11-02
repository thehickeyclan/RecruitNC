-- Fix RLS policies for recruiting_actions table
-- This allows coaches to insert activities for athletes at their school

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can insert actions for their school athletes" ON recruiting_actions;
DROP POLICY IF EXISTS "Coaches can view actions for their school athletes" ON recruiting_actions;
DROP POLICY IF EXISTS "Coaches can update their own actions" ON recruiting_actions;
DROP POLICY IF EXISTS "Coaches can delete their own actions" ON recruiting_actions;

-- Allow coaches to INSERT activities for athletes at their school
CREATE POLICY "Coaches can insert actions for their school athletes"
ON recruiting_actions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.school_id IS NOT NULL
    AND up.school_id = (
      SELECT up2.school_id 
      FROM user_profiles up2 
      WHERE up2.user_id = recruiting_actions.coach_user_id
    )
  )
);

-- Allow coaches to SELECT activities for athletes at their school
CREATE POLICY "Coaches can view actions for their school athletes"
ON recruiting_actions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.school_id IS NOT NULL
    AND up.school_id = (
      SELECT up2.school_id 
      FROM user_profiles up2 
      WHERE up2.user_id = recruiting_actions.coach_user_id
    )
  )
);

-- Allow coaches to UPDATE their own activities
CREATE POLICY "Coaches can update their own actions"
ON recruiting_actions
FOR UPDATE
TO authenticated
USING (coach_user_id = auth.uid())
WITH CHECK (coach_user_id = auth.uid());

-- Allow coaches to DELETE their own activities
CREATE POLICY "Coaches can delete their own actions"
ON recruiting_actions
FOR DELETE
TO authenticated
USING (coach_user_id = auth.uid());
