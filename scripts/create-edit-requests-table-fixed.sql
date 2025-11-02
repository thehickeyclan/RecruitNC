-- Create edit_requests table to track profile edit requests
CREATE TABLE IF NOT EXISTS edit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    athlete_id VARCHAR(50) NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('edit', 'new', 'correction')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_review')),
    request_data JSONB NOT NULL,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_edit_requests_athlete_id ON edit_requests(athlete_id);
CREATE INDEX IF NOT EXISTS idx_edit_requests_user_id ON edit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_edit_requests_status ON edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_edit_requests_created_at ON edit_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_edit_requests_request_type ON edit_requests(request_type);

-- Add table comments
COMMENT ON TABLE edit_requests IS 'Tracks user requests to edit athlete profiles';
COMMENT ON COLUMN edit_requests.athlete_id IS 'ID of the athlete whose profile needs editing';
COMMENT ON COLUMN edit_requests.user_id IS 'ID of the user who submitted the request';
COMMENT ON COLUMN edit_requests.request_type IS 'Type of request: edit, new, or correction';
COMMENT ON COLUMN edit_requests.status IS 'Current status of the request';
COMMENT ON COLUMN edit_requests.request_data IS 'JSON data containing the requested changes';

-- Enable RLS (Row Level Security)
ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own requests" ON edit_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own requests" ON edit_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests" ON edit_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all requests" ON edit_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
