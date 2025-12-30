-- Fix NHSCA division name inconsistencies
-- Normalizes division names to proper case (Freshman, Sophomore, Junior, Senior)

-- Check current division name variations
SELECT DISTINCT division, COUNT(*) as count
FROM nhsca_placements
WHERE year = 2025
GROUP BY division
ORDER BY count DESC;

-- Normalize division names to proper case
UPDATE nhsca_placements
SET division = 
  CASE 
    WHEN LOWER(TRIM(division)) = 'freshman' THEN 'Freshman'
    WHEN LOWER(TRIM(division)) = 'sophomore' THEN 'Sophomore'
    WHEN LOWER(TRIM(division)) = 'junior' THEN 'Junior'
    WHEN LOWER(TRIM(division)) = 'senior' THEN 'Senior'
    ELSE division -- Keep as-is if doesn't match
  END
WHERE year = 2025
  AND LOWER(TRIM(division)) IN ('freshman', 'sophomore', 'junior', 'senior');

-- Verify the fix
SELECT 
  division,
  COUNT(*) as total,
  COUNT(placement) as all_americans
FROM nhsca_placements
WHERE year = 2025
  AND state = 'NC'
GROUP BY division
ORDER BY division;

