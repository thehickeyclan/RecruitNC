-- Make optional fields nullable in athlete_profile_submissions table
-- Only modifying columns that we know exist

ALTER TABLE athlete_profile_submissions 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE athlete_profile_submissions 
ALTER COLUMN location DROP NOT NULL;

-- Try to make other common fields nullable (will skip if they don't exist)
DO $$ 
BEGIN
    -- Make phone nullable if it exists
    BEGIN
        ALTER TABLE athlete_profile_submissions ALTER COLUMN phone DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN
        RAISE NOTICE 'Column phone does not exist, skipping';
    END;
    
    -- Make weightclass nullable if it exists
    BEGIN
        ALTER TABLE athlete_profile_submissions ALTER COLUMN weightclass DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN
        RAISE NOTICE 'Column weightclass does not exist, skipping';
    END;
    
    -- Make highschool nullable if it exists
    BEGIN
        ALTER TABLE athlete_profile_submissions ALTER COLUMN highschool DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN
        RAISE NOTICE 'Column highschool does not exist, skipping';
    END;
END $$;

-- Add comments
COMMENT ON COLUMN athlete_profile_submissions.user_id IS 'Optional: User ID if submission is from an authenticated user. Null for public submissions.';
COMMENT ON COLUMN athlete_profile_submissions.location IS 'Optional: Athlete location/city/state';
