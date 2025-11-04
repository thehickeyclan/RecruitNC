-- Make all optional fields nullable in athlete_profile_submissions table
-- This allows public users to submit profiles with only required fields

-- Required fields that should stay NOT NULL:
-- firstname, lastname, gender, graduationyear, email

-- Make these fields nullable:
ALTER TABLE athlete_profile_submissions 
ALTER COLUMN user_id DROP NOT NULL,
ALTER COLUMN location DROP NOT NULL,
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN weightclass DROP NOT NULL,
ALTER COLUMN college_weight_class DROP NOT NULL,
ALTER COLUMN highschool DROP NOT NULL,
ALTER COLUMN high_school_division DROP NOT NULL,
ALTER COLUMN wrestling_club DROP NOT NULL,
ALTER COLUMN bio DROP NOT NULL,
ALTER COLUMN bio_headline DROP NOT NULL,
ALTER COLUMN achievements DROP NOT NULL,
ALTER COLUMN additional_achievements DROP NOT NULL,
ALTER COLUMN career_record DROP NOT NULL,
ALTER COLUMN instagram DROP NOT NULL,
ALTER COLUMN twitter DROP NOT NULL,
ALTER COLUMN facebook DROP NOT NULL,
ALTER COLUMN gpa DROP NOT NULL,
ALTER COLUMN sat DROP NOT NULL,
ALTER COLUMN act DROP NOT NULL,
ALTER COLUMN academic_summary DROP NOT NULL,
ALTER COLUMN academic_interest DROP NOT NULL,
ALTER COLUMN highlight_video_url DROP NOT NULL,
ALTER COLUMN headshot_url DROP NOT NULL;

-- Add comments
COMMENT ON COLUMN athlete_profile_submissions.user_id IS 'Optional: User ID if submission is from an authenticated user. Null for public submissions.';
COMMENT ON COLUMN athlete_profile_submissions.location IS 'Optional: Athlete location/city/state';
