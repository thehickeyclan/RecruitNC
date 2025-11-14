-- Make location nullable since it might not always be provided
ALTER TABLE athlete_profile_submissions 
ALTER COLUMN location DROP NOT NULL;

-- Add a comment to clarify this field is optional
COMMENT ON COLUMN athlete_profile_submissions.location IS 'Optional: Athlete location/city/state';
