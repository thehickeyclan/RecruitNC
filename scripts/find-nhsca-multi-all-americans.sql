-- Find NHSCA Multi-Time All-Americans and National Champions
-- All-American = placement <= 8 (top 8 placers)
-- National Champion = placement = 1
-- 
-- Usage: Change the HAVING COUNT(*) = X to find 2x, 3x, 4x, etc.

-- ============================================
-- FIND 2x, 3x, 4x ALL-AMERICANS
-- ============================================

-- PRIMARY METHOD: Query nhsca_placements table
-- Change HAVING COUNT(*) = 2 to find different counts (2, 3, 4, etc.)
SELECT 
  athlete_name,
  athlete_id,
  COUNT(*) as all_american_count,
  array_agg(year ORDER BY year) as all_american_years,
  array_agg(placement ORDER BY year) as placements,
  array_agg(weight_class ORDER BY year) as weight_classes,
  array_agg(division ORDER BY year) as divisions
FROM nhsca_placements
WHERE placement IS NOT NULL
  AND placement <= 8
  AND state = 'NC'
GROUP BY athlete_name, athlete_id
HAVING COUNT(*) >= 2  -- Change to = 2, = 3, = 4, etc. for specific counts
ORDER BY all_american_count DESC, athlete_name;

-- ============================================
-- FIND 2x, 3x, 4x NATIONAL CHAMPIONS
-- ============================================

SELECT 
  athlete_name,
  athlete_id,
  COUNT(*) as championship_count,
  array_agg(year ORDER BY year) as championship_years,
  array_agg(weight_class ORDER BY year) as weight_classes,
  array_agg(division ORDER BY year) as divisions
FROM nhsca_placements
WHERE placement = 1
  AND state = 'NC'
GROUP BY athlete_name, athlete_id
HAVING COUNT(*) >= 2  -- Change to = 2, = 3, = 4, etc. for specific counts
ORDER BY championship_count DESC, athlete_name;

-- ============================================
-- COMBINED VIEW: Show matched and unmatched athletes
-- ============================================

-- All-Americans (2x, 3x, 4x)
SELECT 
  COALESCE(a.name, np.athlete_name) as name,
  np.athlete_id,
  a.highschool,
  a.graduationyear,
  COUNT(*) as all_american_count,
  array_agg(np.year ORDER BY np.year) as all_american_years,
  array_agg(np.placement ORDER BY np.year) as placements,
  array_agg(np.weight_class ORDER BY np.year) as weight_classes,
  array_agg(np.division ORDER BY np.year) as divisions,
  CASE 
    WHEN np.athlete_id IS NOT NULL THEN 'Matched'
    ELSE 'Unmatched'
  END as match_status
FROM nhsca_placements np
LEFT JOIN athletes a ON a.id = np.athlete_id
WHERE np.placement IS NOT NULL
  AND np.placement <= 8
  AND np.state = 'NC'
GROUP BY COALESCE(a.name, np.athlete_name), np.athlete_id, a.highschool, a.graduationyear
HAVING COUNT(*) >= 2
ORDER BY all_american_count DESC, COALESCE(a.name, np.athlete_name);

-- National Champions (2x, 3x, 4x)
SELECT 
  COALESCE(a.name, np.athlete_name) as name,
  np.athlete_id,
  a.highschool,
  a.graduationyear,
  COUNT(*) as championship_count,
  array_agg(np.year ORDER BY np.year) as championship_years,
  array_agg(np.weight_class ORDER BY np.year) as weight_classes,
  array_agg(np.division ORDER BY np.year) as divisions,
  CASE 
    WHEN np.athlete_id IS NOT NULL THEN 'Matched'
    ELSE 'Unmatched'
  END as match_status
FROM nhsca_placements np
LEFT JOIN athletes a ON a.id = np.athlete_id
WHERE np.placement = 1
  AND np.state = 'NC'
GROUP BY COALESCE(a.name, np.athlete_name), np.athlete_id, a.highschool, a.graduationyear
HAVING COUNT(*) >= 2
ORDER BY championship_count DESC, COALESCE(a.name, np.athlete_name);

-- ============================================
-- DETAILED BREAKDOWN: Show all placements for each multi-time All-American
-- ============================================

SELECT 
  np.athlete_name,
  np.athlete_id,
  np.year,
  np.placement,
  np.weight_class,
  np.division,
  np.record,
  a.name as matched_athlete_name,
  a.highschool
FROM nhsca_placements np
LEFT JOIN athletes a ON a.id = np.athlete_id
WHERE np.placement IS NOT NULL
  AND np.placement <= 8
  AND np.state = 'NC'
  AND np.athlete_name IN (
    SELECT athlete_name
    FROM nhsca_placements
    WHERE placement IS NOT NULL
      AND placement <= 8
      AND state = 'NC'
    GROUP BY athlete_name, athlete_id
    HAVING COUNT(*) >= 2
  )
ORDER BY COALESCE(a.name, np.athlete_name), np.year;

-- ============================================
-- ALTERNATIVE: Query from athletes.nhsca_results JSONB
-- ============================================

-- All-Americans from JSONB (handles both numeric and string placements)
SELECT 
  a.id,
  a.name,
  a.highschool,
  a.graduationyear,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(a.nhsca_results) AS result
    WHERE (
      -- Handle numeric placements (1-8)
      (result->>'placement')::int <= 8 
      OR
      -- Handle string placements
      result->>'placement' IN ('Champion', 'Finalist', '3rd', '4th', '5th', '6th', '7th', '8th')
      OR
      LOWER(result->>'placement') LIKE '%all-american%'
      OR
      LOWER(result->>'placement') LIKE '%all american%'
    )
  ) as all_american_count,
  (
    SELECT jsonb_agg(result ORDER BY (result->>'year')::int)
    FROM jsonb_array_elements(a.nhsca_results) AS result
    WHERE (
      (result->>'placement')::int <= 8 
      OR
      result->>'placement' IN ('Champion', 'Finalist', '3rd', '4th', '5th', '6th', '7th', '8th')
      OR
      LOWER(result->>'placement') LIKE '%all-american%'
      OR
      LOWER(result->>'placement') LIKE '%all american%'
    )
  ) as all_american_results
FROM athletes a
WHERE a.nhsca_results IS NOT NULL
  AND jsonb_array_length(a.nhsca_results) > 0
  AND (
    SELECT COUNT(*)
    FROM jsonb_array_elements(a.nhsca_results) AS result
    WHERE (
      (result->>'placement')::int <= 8 
      OR
      result->>'placement' IN ('Champion', 'Finalist', '3rd', '4th', '5th', '6th', '7th', '8th')
      OR
      LOWER(result->>'placement') LIKE '%all-american%'
      OR
      LOWER(result->>'placement') LIKE '%all american%'
    )
  ) >= 2
ORDER BY all_american_count DESC, a.name;





