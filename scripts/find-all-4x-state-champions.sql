-- Find ALL 4x State Champions in North Carolina
-- This query checks both the wrestling_nchsaa_results table AND athletes.nchsaa_results JSONB

-- PRIMARY METHOD: Query wrestling_nchsaa_results table (most complete data)
-- Note: Column is 'wrestler_name', not 'athlete_name'
SELECT 
  wrestler_name,
  high_school,
  COUNT(*) as championship_count,
  array_agg(year ORDER BY year) as championship_years,
  array_agg(weight_class ORDER BY year) as weight_classes,
  array_agg(classification ORDER BY year) as classifications
FROM wrestling_nchsaa_results
WHERE placement = 1
  AND state = 'NC'
GROUP BY wrestler_name, high_school
HAVING COUNT(*) = 4
ORDER BY wrestler_name;

-- ALTERNATIVE: Check athletes.nchsaa_results JSONB field (if table doesn't have all data)
SELECT 
  a.id,
  a.name,
  a.high_school,
  a.graduation_year,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(a.nchsaa_results) AS result
    WHERE (result->>'placement')::int = 1
  ) as championship_count
FROM athletes a
WHERE a.nchsaa_results IS NOT NULL
  AND jsonb_array_length(a.nchsaa_results) > 0
  AND (
    SELECT COUNT(*)
    FROM jsonb_array_elements(a.nchsaa_results) AS result
    WHERE (result->>'placement')::int = 1
  ) = 4
ORDER BY a.name;

-- Method 2: If there's a separate nchsaa_placements table
-- Uncomment if you have a dedicated placements table
/*
SELECT 
  athlete_id,
  a.name,
  a.high_school,
  COUNT(*) as championship_count,
  array_agg(year ORDER BY year) as championship_years,
  array_agg(weight_class ORDER BY year) as weight_classes
FROM nchsaa_placements np
JOIN athletes a ON a.id = np.athlete_id
WHERE np.placement = 1
  AND np.state = 'NC'
GROUP BY athlete_id, a.name, a.high_school
HAVING COUNT(*) = 4
ORDER BY a.name;
*/

-- DETAILED BREAKDOWN: Show all 4 championships for each 4x champion
-- From wrestling_nchsaa_results table
SELECT 
  wrestler_name,
  high_school,
  year,
  weight_class,
  classification,
  placement
FROM wrestling_nchsaa_results
WHERE placement = 1
  AND state = 'NC'
  AND wrestler_name IN (
    SELECT wrestler_name
    FROM wrestling_nchsaa_results
    WHERE placement = 1
      AND state = 'NC'
    GROUP BY wrestler_name, high_school
    HAVING COUNT(*) = 4
  )
ORDER BY wrestler_name, year;

