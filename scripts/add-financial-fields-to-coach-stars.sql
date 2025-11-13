-- Add financial information fields to college_coach_stars table
-- These fields allow coaches to track financial aid needs, scholarship requirements, and financial considerations

ALTER TABLE college_coach_stars
ADD COLUMN IF NOT EXISTS financial_efc NUMERIC,
ADD COLUMN IF NOT EXISTS financial_aid_needs TEXT,
ADD COLUMN IF NOT EXISTS scholarship_requirements TEXT,
ADD COLUMN IF NOT EXISTS ability_to_pay TEXT,
ADD COLUMN IF NOT EXISTS financial_notes TEXT,
ADD COLUMN IF NOT EXISTS merit_scholarship_eligible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS need_based_aid_eligible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS aid_application_status TEXT,
ADD COLUMN IF NOT EXISTS financial_concerns TEXT;

COMMENT ON COLUMN college_coach_stars.financial_efc IS 'Expected Family Contribution amount from FAFSA';
COMMENT ON COLUMN college_coach_stars.financial_aid_needs IS 'Description of financial aid needs and requirements';
COMMENT ON COLUMN college_coach_stars.scholarship_requirements IS 'Specific scholarship requirements or amounts needed';
COMMENT ON COLUMN college_coach_stars.ability_to_pay IS 'Family ability to pay (full, partial, significant, full_need, unknown)';
COMMENT ON COLUMN college_coach_stars.financial_notes IS 'Additional financial information or notes';
COMMENT ON COLUMN college_coach_stars.merit_scholarship_eligible IS 'Whether the athlete is eligible for merit scholarships';
COMMENT ON COLUMN college_coach_stars.need_based_aid_eligible IS 'Whether the athlete is eligible for need-based aid';
COMMENT ON COLUMN college_coach_stars.aid_application_status IS 'Status of financial aid application (not_started, in_progress, fafsa_submitted, completed, not_applying)';
COMMENT ON COLUMN college_coach_stars.financial_concerns IS 'Any financial concerns that may affect enrollment decisions';
