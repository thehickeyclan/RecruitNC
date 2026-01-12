-- Fix RLS policies for athletes table to allow admin updates
-- This ensures admins can update athlete records including bio fields

-- Enable RLS on athletes table if not already enabled
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can manage all athletes" ON athletes;
DROP POLICY IF EXISTS "Admins can view all athletes" ON athletes;
DROP POLICY IF EXISTS "Admins can update all athletes" ON athletes;
DROP POLICY IF EXISTS "Admins can insert athletes" ON athletes;
DROP POLICY IF EXISTS "Public can view athletes" ON athletes;
DROP POLICY IF EXISTS "Authenticated users can view athletes" ON athletes;

-- Policy: Admins can view all athletes
CREATE POLICY "Admins can view all athletes"
ON athletes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Policy: Admins can insert athletes
CREATE POLICY "Admins can insert athletes"
ON athletes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Policy: Admins can update all athletes (including bio fields)
CREATE POLICY "Admins can update all athletes"
ON athletes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Policy: Admins can delete athletes
CREATE POLICY "Admins can delete athletes"
ON athletes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Policy: Public can view athletes (for public pages)
CREATE POLICY "Public can view athletes"
ON athletes
FOR SELECT
TO public
USING (true);

