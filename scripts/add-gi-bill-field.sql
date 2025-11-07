-- Add GI Bill eligibility tracking to coach-specific financial data

ALTER TABLE college_coach_stars
ADD COLUMN IF NOT EXISTS gi_bill_eligible BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN college_coach_stars.gi_bill_eligible IS 'Indicates whether the athlete can leverage GI Bill benefits (coach-specific).';

