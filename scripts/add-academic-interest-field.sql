-- Add academic_interest field to athletes table
-- This field will store the athlete's academic interests/major preferences

ALTER TABLE athletes 
ADD COLUMN IF NOT EXISTS academic_interest text;

-- Add comment to document the field
COMMENT ON COLUMN athletes.academic_interest IS 'Academic interests, intended major, or field of study preferences';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'athletes' AND column_name = 'academic_interest';
