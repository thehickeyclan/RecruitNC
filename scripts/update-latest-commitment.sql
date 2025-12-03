-- Update a specific athlete's updated_at to make them appear as the latest commit
-- Replace 'ATHLETE_NAME' with the actual name

-- Usage example:
-- UPDATE athletes
-- SET updated_at = NOW()
-- WHERE name ILIKE '%Austin%Green%';

-- Generic template - update the name in the WHERE clause
UPDATE athletes
SET 
  commitmentdate = CURRENT_DATE,
  updated_at = NOW()
WHERE name ILIKE '%ATHLETE_NAME%'
  AND college IS NOT NULL
  AND college != ''
RETURNING id, name, college, graduationyear, updated_at;

-- Verify the top 5 latest commitments
SELECT 
  name,
  highschool,
  college,
  graduationyear,
  updated_at,
  commitmentdate
FROM athletes
WHERE college IS NOT NULL 
  AND college != ''
  AND graduationyear >= 2026
ORDER BY updated_at DESC
LIMIT 5;

