-- Add coach_approved column to user_profiles table

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS coach_approved BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN user_profiles.coach_approved IS 'Whether a college coach has been approved to access athlete contact information';

-- Create an index for faster queries on coach_approved status
CREATE INDEX IF NOT EXISTS idx_user_profiles_coach_approved 
ON user_profiles(coach_approved) 
WHERE role = 'college_coach';

