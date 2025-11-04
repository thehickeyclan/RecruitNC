-- Check actual data for commitment stats debugging

-- Count total athletes with commitments
SELECT COUNT(*) as total_with_college
FROM athletes
WHERE college IS NOT NULL AND college != '';

-- Count 2025 commitments
SELECT COUNT(*) as class_2025
FROM athletes
WHERE college IS NOT NULL 
  AND college != ''
  AND graduationyear = 2025;

-- Count 2026 commitments
SELECT COUNT(*) as class_2026
FROM athletes
WHERE college IS NOT NULL 
  AND college != ''
  AND graduationyear = 2026;

-- Check actual division values in use
SELECT division, COUNT(*) as count
FROM athletes
WHERE college IS NOT NULL AND college != ''
GROUP BY division
ORDER BY count DESC;

-- Sample 2026 athletes with commitments
SELECT id, name, college, division, graduationyear, is_prospect
FROM athletes
WHERE college IS NOT NULL 
  AND college != ''
  AND graduationyear = 2026
LIMIT 20;

-- Check if is_prospect flag is causing issues
SELECT 
  is_prospect,
  COUNT(*) as count
FROM athletes
WHERE college IS NOT NULL AND college != ''
GROUP BY is_prospect;

