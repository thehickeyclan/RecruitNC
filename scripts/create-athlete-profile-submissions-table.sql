-- Create athlete profile submissions table for user-submitted profiles awaiting approval
CREATE TABLE IF NOT EXISTS athlete_profile_submissions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Information
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  
  -- Athletic Information
  gender VARCHAR(10) NOT NULL,
  graduationYear INTEGER NOT NULL,
  weightClass VARCHAR(10) NOT NULL,
  highSchool VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  
  -- Optional Information
  bio TEXT,
  achievements TEXT,
  photoUrl TEXT,
  
  -- Submission Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE athlete_profile_submissions ENABLE ROW LEVEL SECURITY;

-- Users can read their own submissions
CREATE POLICY "Users can read their own submissions"
  ON athlete_profile_submissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can insert their own submissions"
  ON athlete_profile_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all submissions
CREATE POLICY "Admins can read all submissions"
  ON athlete_profile_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update all submissions
CREATE POLICY "Admins can update all submissions"
  ON athlete_profile_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_athlete_submissions_user_id ON athlete_profile_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_athlete_submissions_status ON athlete_profile_submissions(status);
CREATE INDEX IF NOT EXISTS idx_athlete_submissions_submitted_at ON athlete_profile_submissions(submitted_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_athlete_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER athlete_submissions_updated_at
  BEFORE UPDATE ON athlete_profile_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_athlete_submissions_updated_at();
