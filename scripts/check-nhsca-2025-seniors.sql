-- Check NHSCA 2025 Senior Division Data
-- Run this in Supabase SQL Editor to see what's actually stored

-- 1. Total count and breakdown
SELECT 
  COUNT(*) as total_participants,
  COUNT(placement) as all_americans,
  COUNT(*) - COUNT(placement) as non_placers,
  COUNT(CASE WHEN placement = 1 THEN 1 END) as champions,
  COUNT(CASE WHEN placement <= 2 THEN 1 END) as finalists,
  COUNT(CASE WHEN placement <= 4 THEN 1 END) as top4,
  COUNT(CASE WHEN placement <= 8 THEN 1 END) as top8
FROM nhsca_placements
WHERE year = 2025
  AND state = 'NC'
  AND LOWER(TRIM(division)) = 'senior';

-- 2. Check for division name variations (case sensitivity issues)
SELECT 
  division,
  COUNT(*) as count
FROM nhsca_placements
WHERE year = 2025
  AND state = 'NC'
  AND LOWER(TRIM(division)) LIKE '%senior%'
GROUP BY division
ORDER BY count DESC;

-- 3. Show all 2025 Senior placements with details
SELECT 
  athlete_name,
  high_school,
  weight_class,
  division,
  placement,
  record,
  match_status,
  athlete_id
FROM nhsca_placements
WHERE year = 2025
  AND state = 'NC'
  AND LOWER(TRIM(division)) = 'senior'
ORDER BY 
  CASE 
    WHEN placement IS NULL THEN 999
    ELSE placement
  END,
  weight_class;

-- 4. Placement breakdown (how many at each placement)
SELECT 
  COALESCE(placement::text, 'Did not place') as placement,
  COUNT(*) as count
FROM nhsca_placements
WHERE year = 2025
  AND state = 'NC'
  AND LOWER(TRIM(division)) = 'senior'
GROUP BY placement
ORDER BY 
  CASE 
    WHEN placement IS NULL THEN 999
    ELSE placement
  END;

-- 5. Check if there are any 2025 entries with wrong division or missing division
SELECT 
  division,
  COUNT(*) as count,
  COUNT(placement) as placers
FROM nhsca_placements
WHERE year = 2025
  AND state = 'NC'
GROUP BY division
ORDER BY count DESC;

-- 6. Summary: What should be vs what is
SELECT 
  'Expected' as source,
  NULL::integer as total_participants,
  NULL::integer as all_americans
UNION ALL
SELECT 
  'Actual in Database' as source,
  COUNT(*)::integer as total_participants,
  COUNT(placement)::integer as all_americans
FROM nhsca_placements
WHERE year = 2025
  AND state = 'NC'
  AND LOWER(TRIM(division)) = 'senior';

