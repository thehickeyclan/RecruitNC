-- Set all existing athletes to "NC" state if location is null or empty
-- This script should be run before coaches start adding out-of-state prospects

-- Update athletes table - set location to "NC" where it's null or empty
UPDATE athletes 
SET location = 'NC'
WHERE location IS NULL OR location = '' OR TRIM(location) = '';

-- Verify the update
SELECT 
  COUNT(*) as total_athletes,
  COUNT(CASE WHEN location = 'NC' THEN 1 END) as nc_athletes,
  COUNT(CASE WHEN location IS NULL OR location = '' THEN 1 END) as empty_location
FROM athletes;

-- Show sample of updated records
SELECT 
  id, 
  name, 
  highschool, 
  location, 
  graduationyear
FROM athletes
WHERE location = 'NC'
LIMIT 10;

COMMENT ON COLUMN athletes.location IS 'Athlete state/location (e.g., NC, VA, SC). Used to track in-state vs out-of-state recruiting.';
