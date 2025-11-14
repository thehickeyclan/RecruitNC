CREATE TABLE IF NOT EXISTS edit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  athlete_id UUID REFERENCES athletes(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('edit', 'new')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  request_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS edit_requests_user_id_idx ON edit_requests(user_id);
CREATE INDEX IF NOT EXISTS edit_requests_status_idx ON edit_requests(status);
CREATE INDEX IF NOT EXISTS edit_requests_created_at_idx ON edit_requests(created_at);

-- Add RLS policies
ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY edit_requests_select_policy ON edit_requests 
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own submissions
CREATE POLICY edit_requests_insert_policy ON edit_requests 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admins can update submissions
CREATE POLICY edit_requests_update_policy ON edit_requests 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can view all submissions
CREATE POLICY edit_requests_admin_select_policy ON edit_requests 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
