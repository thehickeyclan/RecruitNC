-- Check if 2026 rankings were actually saved to database
SELECT 
  name,
  graduationyear,
  gender,
  prospect_ranking,
  highschool
FROM athletes 
WHERE graduationyear = 2026 
  AND gender = 'Male' 
  AND prospect_ranking IS NOT NULL
ORDER BY prospect_ranking ASC
LIMIT 10;

-- Also check total counts
SELECT 
  'Total 2026 Male Athletes' as description,
  COUNT(*) as count
FROM athletes 
WHERE graduationyear = 2026 AND gender = 'Male'

UNION ALL

SELECT 
  'Ranked 2026 Male Athletes' as description,
  COUNT(*) as count
FROM athletes 
WHERE graduationyear = 2026 
  AND gender = 'Male' 
  AND prospect_ranking IS NOT NULL;
