-- Add school_id column to user_profiles table to link coaches to schools
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_id ON user_profiles(school_id);

-- Update the comment
COMMENT ON COLUMN user_profiles.school_id IS 'Links college coaches to their school for branded portal access';
