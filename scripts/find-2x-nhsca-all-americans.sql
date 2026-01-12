-- Find ALL 2x NHSCA All-Americans in North Carolina
-- All-American = placement <= 8 (top 8 placers)
-- This query checks both the nhsca_placements table AND athletes.nhsca_results JSONB

-- PRIMARY METHOD: Query nhsca_placements table (most complete data)
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
HAVING COUNT(*) = 2
ORDER BY athlete_name;

-- ALTERNATIVE: Check athletes.nhsca_results JSONB field (if table doesn't have all data)
-- Note: This handles both numeric placements (1-8) and string placements ("Champion", "2nd", etc.)
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
      -- Handle string placements that indicate All-American status
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
  ) = 2
ORDER BY a.name;

-- DETAILED BREAKDOWN: Show all All-American placements for each 2x All-American
-- From nhsca_placements table
SELECT 
  athlete_name,
  athlete_id,
  year,
  placement,
  weight_class,
  division,
  record
FROM nhsca_placements
WHERE placement IS NOT NULL
  AND placement <= 8
  AND state = 'NC'
  AND athlete_name IN (
    SELECT athlete_name
    FROM nhsca_placements
    WHERE placement IS NOT NULL
      AND placement <= 8
      AND state = 'NC'
    GROUP BY athlete_name, athlete_id
    HAVING COUNT(*) = 2
  )
ORDER BY athlete_name, year;

-- COMBINED VIEW: Show both matched (with athlete_id) and unmatched athletes
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
HAVING COUNT(*) = 2
ORDER BY COALESCE(a.name, np.athlete_name);





