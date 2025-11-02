-- Add is_test flag to schools table to mark test/internal schools
-- Test schools won't appear in coach assignment dropdowns but can still be used for testing

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- Mark NC United Wrestling as a test school
UPDATE schools
SET is_test = true
WHERE LOWER(name) IN ('nc united wrestling', 'nc united');

-- Add comment for documentation
COMMENT ON COLUMN schools.is_test IS 'Marks schools as test/internal. These schools will not appear in coach assignment dropdowns but can be used for testing purposes.';

-- Verify the update
SELECT id, name, is_test 
FROM schools 
ORDER BY is_test DESC, name;

