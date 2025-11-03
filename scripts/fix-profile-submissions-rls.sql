-- Fix RLS policy to allow public prospect submissions

-- Enable RLS on the table if not already enabled
ALTER TABLE athlete_profile_submissions ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can submit profiles" ON athlete_profile_submissions;
DROP POLICY IF EXISTS "Public can insert profiles" ON athlete_profile_submissions;
DROP POLICY IF EXISTS "Allow authenticated users to submit profiles" ON athlete_profile_submissions;
DROP POLICY IF EXISTS "Allow public to insert profile submissions" ON athlete_profile_submissions;
DROP POLICY IF EXISTS "Allow admins to manage submissions" ON athlete_profile_submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON athlete_profile_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON athlete_profile_submissions;

-- Allow anyone (authenticated or anonymous) to submit profile
CREATE POLICY "Anyone can submit profiles"
ON athlete_profile_submissions
FOR INSERT
TO public
WITH CHECK (true);

-- Allow admins to view all submissions
CREATE POLICY "Admins can view all submissions"
ON athlete_profile_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
);

-- Allow admins to update submissions (for approval/rejection)
CREATE POLICY "Admins can update submissions"
ON athlete_profile_submissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
);

