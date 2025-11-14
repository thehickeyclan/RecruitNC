-- Make optional fields nullable in athlete_profile_submissions
-- These fields were NOT NULL but should be optional for public submissions

ALTER TABLE athlete_profile_submissions 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE athlete_profile_submissions 
ALTER COLUMN location DROP NOT NULL;

-- Make other optional fields nullable if they have NOT NULL constraints
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE athlete_profile_submissions ALTER COLUMN weightclass DROP NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE athlete_profile_submissions ALTER COLUMN highschool DROP NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE athlete_profile_submissions ALTER COLUMN phone DROP NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END;
END $$;
