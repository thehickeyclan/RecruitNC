-- Table for edit requests
CREATE TABLE IF NOT EXISTS edit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  athlete_id UUID REFERENCES athletes(id),
  request_type VARCHAR(50) NOT NULL, -- 'edit' or 'new'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  request_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_edit_requests_status ON edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_edit_requests_user_id ON edit_requests(user_id);

-- Add RLS policies
ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY view_own_requests ON edit_requests 
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own submissions
CREATE POLICY create_own_requests ON edit_requests 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admins can update submissions
CREATE POLICY update_as_admin ON edit_requests 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );
