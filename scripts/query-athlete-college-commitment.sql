-- Query to find what college an athlete wrestles for
-- This query intelligently determines if athlete is currently in college or committed for future
-- 
-- Usage: Replace 'liam hickey' with the athlete name you're searching for
-- Example: "What college does Liam Hickey wrestle for?"

SELECT 
  name,
  college,
  division,
  graduationyear,
  recruiting_status,
  commitmentdate,
  weightclass,
  college_weight_class,
  gender,
  highschool,
  CASE 
    WHEN graduationyear < EXTRACT(YEAR FROM CURRENT_DATE) 
      THEN 'Currently Attending'
    WHEN graduationyear = EXTRACT(YEAR FROM CURRENT_DATE) 
      THEN 'Starting This Year'
    ELSE 'Committed (Starts ' || graduationyear::TEXT || ')'
  END as status_description
FROM athletes
WHERE LOWER(TRIM(name)) LIKE '%liam%hickey%'
  AND college IS NOT NULL
  AND college != ''
ORDER BY graduationyear DESC, commitmentdate DESC
LIMIT 1;

-- Alternative: More flexible name matching (handles variations)
SELECT 
  name,
  college,
  division,
  graduationyear,
  recruiting_status,
  commitmentdate,
  weightclass,
  college_weight_class,
  gender,
  highschool,
  CASE 
    WHEN graduationyear < EXTRACT(YEAR FROM CURRENT_DATE) 
      THEN 'Currently Attending'
    WHEN graduationyear = EXTRACT(YEAR FROM CURRENT_DATE) 
      THEN 'Starting This Year'
    ELSE 'Committed (Starts ' || graduationyear::TEXT || ')'
  END as status_description
FROM athletes
WHERE (
    LOWER(TRIM(name)) LIKE '%liam%hickey%'
    OR LOWER(TRIM(name)) LIKE '%hickey%liam%'
    OR LOWER(TRIM(name)) = 'liam hickey'
  )
  AND college IS NOT NULL
  AND college != ''
ORDER BY graduationyear DESC, commitmentdate DESC;

-- Get all 2025 commitments (athletes who should be starting college this year)
SELECT 
  name,
  college,
  division,
  graduationyear,
  recruiting_status,
  commitmentdate,
  weightclass,
  college_weight_class,
  gender,
  highschool
FROM athletes
WHERE graduationyear = 2025
  AND college IS NOT NULL
  AND college != ''
ORDER BY college, name;

-- Get all current college athletes (graduated 2025 or earlier)
SELECT 
  name,
  college,
  division,
  graduationyear,
  recruiting_status,
  commitmentdate,
  weightclass,
  college_weight_class,
  gender,
  highschool
FROM athletes
WHERE graduationyear <= EXTRACT(YEAR FROM CURRENT_DATE)
  AND college IS NOT NULL
  AND college != ''
  AND recruiting_status IN ('Committed', 'Signed', 'College Athlete')
ORDER BY college, name;




