-- Fix RLS policies for college_coach_stars table
-- This allows admins and coaches to read star data

-- Drop existing policies if any
DROP POLICY IF EXISTS "Coaches can view their own stars" ON college_coach_stars;
DROP POLICY IF EXISTS "Admins can view all stars" ON college_coach_stars;
DROP POLICY IF EXISTS "Coaches can manage their own stars" ON college_coach_stars;
DROP POLICY IF EXISTS "Admins can manage all stars" ON college_coach_stars;

-- Allow coaches to view their own stars
CREATE POLICY "Coaches can view their own stars"
ON college_coach_stars
FOR SELECT
TO authenticated
USING (
  coach_user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
);

-- Allow coaches to insert their own stars
CREATE POLICY "Coaches can manage their own stars"
ON college_coach_stars
FOR ALL
TO authenticated
USING (
  coach_user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
)
WITH CHECK (
  coach_user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
);
