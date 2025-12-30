-- Luke Richards NHSCA 2025 Results
-- Query the nhsca_placements table for Luke Richards' 2025 results

-- Method 1: Direct query from nhsca_placements table
SELECT 
  id,
  year,
  athlete_name,
  high_school,
  division,
  weight_class,
  placement,
  record,
  match_status,
  athlete_id,
  notes,
  source,
  imported_at
FROM nhsca_placements
WHERE year = 2025
  AND (
    LOWER(TRIM(athlete_name)) LIKE '%luke%richards%'
    OR LOWER(TRIM(athlete_name)) LIKE '%richards%luke%'
  )
ORDER BY division, weight_class;

-- Method 2: Case-insensitive exact match
SELECT 
  id,
  year,
  athlete_name,
  high_school,
  division,
  weight_class,
  placement,
  record,
  match_status,
  athlete_id,
  notes,
  source,
  imported_at
FROM nhsca_placements
WHERE year = 2025
  AND (
    LOWER(TRIM(athlete_name)) = 'luke richards'
    OR LOWER(TRIM(athlete_name)) = 'luke j richards'
    OR LOWER(TRIM(athlete_name)) = 'l. richards'
    OR LOWER(TRIM(athlete_name)) LIKE 'luke%richards%'
    OR LOWER(TRIM(athlete_name)) LIKE '%richards%luke%'
  )
ORDER BY division, weight_class;

-- Method 3: If matched to athlete profile, also show athlete info
SELECT 
  np.id,
  np.year,
  np.athlete_name,
  np.high_school,
  np.division,
  np.weight_class,
  np.placement,
  np.record,
  np.match_status,
  np.athlete_id,
  a.name as athlete_profile_name,
  a.high_school as athlete_profile_school,
  np.notes,
  np.source,
  np.imported_at
FROM nhsca_placements np
LEFT JOIN athletes a ON a.id = np.athlete_id
WHERE np.year = 2025
  AND (
    LOWER(TRIM(np.athlete_name)) LIKE '%luke%richards%'
    OR LOWER(TRIM(np.athlete_name)) LIKE '%richards%luke%'
    OR (a.name IS NOT NULL AND LOWER(TRIM(a.name)) LIKE '%luke%richards%')
  )
ORDER BY np.division, np.weight_class;

-- Method 4: Also check if data is in athlete profile's nhsca_results JSONB
SELECT 
  a.id,
  a.name,
  a.high_school,
  a.graduation_year,
  jsonb_array_elements(a.nhsca_results) as nhsca_result
FROM athletes a,
  jsonb_array_elements(a.nhsca_results) AS nhsca_result
WHERE LOWER(TRIM(a.name)) LIKE '%luke%richards%'
  AND (nhsca_result->>'year')::int = 2025
ORDER BY (nhsca_result->>'year')::int DESC;

