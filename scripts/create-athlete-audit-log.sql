-- Create audit_log table to track all athlete profile changes
CREATE TABLE IF NOT EXISTS athlete_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_type TEXT NOT NULL CHECK (change_type IN ('athlete_edit', 'admin_edit', 'admin_reject')),
    ip_address INET,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_audit_log_athlete_id ON athlete_audit_log(athlete_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON athlete_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON athlete_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_change_type ON athlete_audit_log(change_type);

-- Add table comment
COMMENT ON TABLE athlete_audit_log IS 'Full audit trail of all athlete profile changes';

-- Enable RLS
ALTER TABLE athlete_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs" ON athlete_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.is_admin = true
        )
    );

-- Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs" ON athlete_audit_log
    FOR SELECT
    USING (auth.uid() = user_id);

-- Only system can insert (via service role)
-- No INSERT policy needed - will use service role client

-- Add last_edited_by and last_edited_at to athletes table
ALTER TABLE athletes 
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;

-- Create index for last_edited_at
CREATE INDEX IF NOT EXISTS idx_athletes_last_edited_at ON athletes(last_edited_at DESC);

