-- Fix NHSCA division name inconsistencies
-- Normalizes division names to proper case (Freshman, Sophomore, Junior, Senior)
-- Run this for ALL years, not just 2025

-- Step 1: Check current division name variations (all years)
SELECT DISTINCT division, COUNT(*) as count
FROM nhsca_placements
GROUP BY division
ORDER BY count DESC;

-- Step 2: Normalize division names to proper case (ALL years)
UPDATE nhsca_placements
SET division = 
  CASE 
    WHEN LOWER(TRIM(division)) = 'freshman' THEN 'Freshman'
    WHEN LOWER(TRIM(division)) = 'sophomore' THEN 'Sophomore'
    WHEN LOWER(TRIM(division)) = 'junior' THEN 'Junior'
    WHEN LOWER(TRIM(division)) = 'senior' THEN 'Senior'
    ELSE division -- Keep as-is if doesn't match
  END
WHERE LOWER(TRIM(division)) IN ('freshman', 'sophomore', 'junior', 'senior');

-- Step 3: Verify the fix for 2025
SELECT 
  division,
  COUNT(*) as total,
  COUNT(placement) as all_americans
FROM nhsca_placements
WHERE year = 2025
  AND state = 'NC'
GROUP BY division
ORDER BY division;

-- Step 4: Verify for all years
SELECT 
  year,
  division,
  COUNT(*) as total,
  COUNT(placement) as all_americans
FROM nhsca_placements
WHERE state = 'NC'
GROUP BY year, division
ORDER BY year DESC, division;

