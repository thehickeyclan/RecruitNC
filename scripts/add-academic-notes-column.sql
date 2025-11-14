-- Add academic_notes column to college_coach_stars table

ALTER TABLE college_coach_stars
ADD COLUMN IF NOT EXISTS academic_notes TEXT;

COMMENT ON COLUMN college_coach_stars.academic_notes IS 'Coach private notes about athlete academics (GPA obtained during conversation, test scores, academic interests, etc.)';
