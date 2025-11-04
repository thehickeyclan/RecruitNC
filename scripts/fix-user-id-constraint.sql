-- Make user_id nullable since public users can submit profiles
ALTER TABLE athlete_profile_submissions 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a comment to clarify this field is optional
COMMENT ON COLUMN athlete_profile_submissions.user_id IS 'Optional: User ID if submission is from an authenticated user. Null for public submissions.';
