-- Check Jalen Bethea's status and Andrew College association

SELECT 
  id,
  name,
  "firstName",
  "lastName",
  graduationyear,
  recruiting_status,
  college,
  location,
  highschool,
  weightclass
FROM athletes
WHERE (
  name ILIKE '%Jalen%Bethea%' OR
  name ILIKE '%Jalen Bethea%' OR
  ("firstName" ILIKE '%Jalen%' AND "lastName" ILIKE '%Bethea%')
)
AND graduationyear = 2025;
