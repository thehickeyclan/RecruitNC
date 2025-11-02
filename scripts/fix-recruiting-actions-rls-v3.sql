-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can insert activities for athletes at their school" ON recruiting_actions;
DROP POLICY IF EXISTS "Coaches can view activities for athletes at their school" ON recruiting_actions;
DROP POLICY IF EXISTS "Coaches can update their own activities" ON recruiting_actions;
DROP POLICY IF EXISTS "Coaches can delete their own activities" ON recruiting_actions;

-- Enable RLS on recruiting_actions table
ALTER TABLE recruiting_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can insert activities for athletes at their school
CREATE POLICY "Coaches can insert activities for athletes at their school"
ON recruiting_actions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_profiles coach_profile
    JOIN athletes ON athletes.id = recruiting_actions.athlete_id
    JOIN user_profiles athlete_profile ON athlete_profile.user_id = athletes.user_id
    WHERE coach_profile.user_id = auth.uid()
    AND coach_profile.school_id = athlete_profile.school_id
    AND recruiting_actions.coach_user_id = auth.uid()
  )
);

-- Policy: Coaches can view activities for athletes at their school
CREATE POLICY "Coaches can view activities for athletes at their school"
ON recruiting_actions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles coach_profile
    JOIN athletes ON athletes.id = recruiting_actions.athlete_id
    JOIN user_profiles athlete_profile ON athlete_profile.user_id = athletes.user_id
    WHERE coach_profile.user_id = auth.uid()
    AND coach_profile.school_id = athlete_profile.school_id
  )
);

-- Policy: Coaches can update their own activities
CREATE POLICY "Coaches can update their own activities"
ON recruiting_actions
FOR UPDATE
TO authenticated
USING (coach_user_id = auth.uid())
WITH CHECK (coach_user_id = auth.uid());

-- Policy: Coaches can delete their own activities
CREATE POLICY "Coaches can delete their own activities"
ON recruiting_actions
FOR DELETE
TO authenticated
USING (coach_user_id = auth.uid());
