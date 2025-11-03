-- Expand athlete_profile_submissions table to match full athlete profile

ALTER TABLE athlete_profile_submissions
-- Social media
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,

-- Academic info
ADD COLUMN IF NOT EXISTS gpa NUMERIC,
ADD COLUMN IF NOT EXISTS sat INTEGER,
ADD COLUMN IF NOT EXISTS act INTEGER,
ADD COLUMN IF NOT EXISTS academic_summary TEXT,
ADD COLUMN IF NOT EXISTS academic_interest TEXT,

-- Tournament records
ADD COLUMN IF NOT EXISTS career_record TEXT,
ADD COLUMN IF NOT EXISTS super_32_2023_record TEXT,
ADD COLUMN IF NOT EXISTS super_32_2023_placement TEXT,
ADD COLUMN IF NOT EXISTS super_32_2024_record TEXT,
ADD COLUMN IF NOT EXISTS super_32_2024_placement TEXT,
ADD COLUMN IF NOT EXISTS super_32_2025_record TEXT,
ADD COLUMN IF NOT EXISTS super_32_2025_placement TEXT,
ADD COLUMN IF NOT EXISTS nhsca_2023_record TEXT,
ADD COLUMN IF NOT EXISTS nhsca_2023_placement TEXT,
ADD COLUMN IF NOT EXISTS nhsca_2024_record TEXT,
ADD COLUMN IF NOT EXISTS nhsca_2024_placement TEXT,
ADD COLUMN IF NOT EXISTS nhsca_2025_record TEXT,
ADD COLUMN IF NOT EXISTS nhsca_2025_placement TEXT,
ADD COLUMN IF NOT EXISTS nationally_ranked_wins TEXT,
ADD COLUMN IF NOT EXISTS college_opens_experience TEXT,

-- Additional info
ADD COLUMN IF NOT EXISTS additional_achievements TEXT,
ADD COLUMN IF NOT EXISTS highlight_video_url TEXT,
ADD COLUMN IF NOT EXISTS headshot_url TEXT,
ADD COLUMN IF NOT EXISTS high_school_division TEXT,
ADD COLUMN IF NOT EXISTS college_weight_class TEXT,
ADD COLUMN IF NOT EXISTS bio_headline TEXT;

-- Add comments
COMMENT ON COLUMN athlete_profile_submissions.instagram IS 'Instagram handle';
COMMENT ON COLUMN athlete_profile_submissions.twitter IS 'Twitter/X handle';
COMMENT ON COLUMN athlete_profile_submissions.facebook IS 'Facebook profile URL';
COMMENT ON COLUMN athlete_profile_submissions.gpa IS 'GPA on 4.0 scale';
COMMENT ON COLUMN athlete_profile_submissions.sat IS 'SAT score (out of 1600)';
COMMENT ON COLUMN athlete_profile_submissions.act IS 'ACT score (out of 36)';
COMMENT ON COLUMN athlete_profile_submissions.academic_summary IS 'Academic background and achievements';
COMMENT ON COLUMN athlete_profile_submissions.academic_interest IS 'Intended major or academic interests';
COMMENT ON COLUMN athlete_profile_submissions.career_record IS 'Overall wrestling career record (W-L)';
COMMENT ON COLUMN athlete_profile_submissions.highlight_video_url IS 'URL to highlight video';
COMMENT ON COLUMN athlete_profile_submissions.headshot_url IS 'URL to headshot photo';
COMMENT ON COLUMN athlete_profile_submissions.college_weight_class IS 'Projected college weight class';

