-- Fix RLS policy to allow admins and coaches to manage roster entries

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can insert roster entries" ON college_coach_stars;
DROP POLICY IF EXISTS "Admins can update roster entries" ON college_coach_stars;
DROP POLICY IF EXISTS "Admins can delete roster entries" ON college_coach_stars;

-- Allow admins and coaches to insert roster entries
CREATE POLICY "Admins can insert roster entries"
ON college_coach_stars
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
  OR
  coach_user_id = auth.uid()
);

-- Allow admins and coaches to update roster entries
CREATE POLICY "Admins can update roster entries"
ON college_coach_stars
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
  OR
  coach_user_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
  OR
  coach_user_id = auth.uid()
);

-- Allow admins and coaches to delete roster entries
CREATE POLICY "Admins can delete roster entries"
ON college_coach_stars
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
  OR
  coach_user_id = auth.uid()
);
