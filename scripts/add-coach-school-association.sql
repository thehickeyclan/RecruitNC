-- Add school_id to user_profiles table for coach-school association
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS school_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_id ON user_profiles(school_id);

-- Add comment
COMMENT ON COLUMN user_profiles.school_id IS 'College/University name that the coach is associated with';
