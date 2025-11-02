-- Add missing financial columns to college_coach_stars table
-- This script adds the remaining 5 columns that weren't created

ALTER TABLE college_coach_stars
ADD COLUMN IF NOT EXISTS scholarship_requirements TEXT,
ADD COLUMN IF NOT EXISTS ability_to_pay TEXT,
ADD COLUMN IF NOT EXISTS merit_scholarship_eligible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS need_based_aid_eligible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS aid_application_status TEXT;

-- Add comments for documentation
COMMENT ON COLUMN college_coach_stars.scholarship_requirements IS 'Specific scholarship requirements or amounts needed';
COMMENT ON COLUMN college_coach_stars.ability_to_pay IS 'Family ability to pay (full, partial, significant, full_need, unknown)';
COMMENT ON COLUMN college_coach_stars.merit_scholarship_eligible IS 'Whether the athlete is eligible for merit scholarships';
COMMENT ON COLUMN college_coach_stars.need_based_aid_eligible IS 'Whether the athlete is eligible for need-based aid';
COMMENT ON COLUMN college_coach_stars.aid_application_status IS 'Status of financial aid application (not_started, in_progress, fafsa_submitted, completed, not_applying)';

