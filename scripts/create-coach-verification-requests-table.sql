-- Create coach verification requests table
CREATE TABLE IF NOT EXISTS coach_verification_requests (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Information
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  institution VARCHAR(255) NOT NULL,
  coaching_position VARCHAR(100) NOT NULL,
  years_experience INTEGER,
  
  -- Verification Information
  coaching_credentials TEXT,
  references_contact TEXT,
  additional_info TEXT,
  
  -- Request Status
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
ALTER TABLE coach_verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own requests
CREATE POLICY "Users can read their own verification requests"
  ON coach_verification_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "Users can insert their own verification requests"
  ON coach_verification_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all requests
CREATE POLICY "Admins can read all verification requests"
  ON coach_verification_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update all requests
CREATE POLICY "Admins can update all verification requests"
  ON coach_verification_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_verification_user_id ON coach_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_verification_status ON coach_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_coach_verification_submitted_at ON coach_verification_requests(submitted_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_coach_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coach_verification_updated_at
  BEFORE UPDATE ON coach_verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_coach_verification_updated_at();
