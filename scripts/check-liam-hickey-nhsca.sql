-- Check Liam Hickey's NHSCA data in the database
-- This will show both old column format and new JSON format

SELECT 
  id,
  name,
  graduationyear,
  -- Old column format
  nhsca_2023_placement,
  nhsca_2023_record,
  nhsca_2024_placement,
  nhsca_2024_record,
  nhsca_2025_placement,
  nhsca_2025_record,
  -- New JSON format
  nhsca_results,
  -- Check if JSON is populated
  CASE 
    WHEN nhsca_results IS NULL THEN 'NULL'
    WHEN nhsca_results = '[]'::jsonb THEN 'EMPTY ARRAY'
    ELSE 'HAS DATA'
  END as nhsca_results_status,
  jsonb_array_length(COALESCE(nhsca_results, '[]'::jsonb)) as nhsca_results_count
FROM athletes
WHERE LOWER(name) LIKE '%liam%hickey%'
   OR LOWER(name) LIKE '%hickey%liam%'
ORDER BY name;

-- Also check if there's any NHSCA data in old columns that needs migration
SELECT 
  id,
  name,
  'Has old column data' as status,
  CASE 
    WHEN nhsca_2025_placement IS NOT NULL OR nhsca_2025_record IS NOT NULL THEN '2025'
    WHEN nhsca_2024_placement IS NOT NULL OR nhsca_2024_record IS NOT NULL THEN '2024'
    WHEN nhsca_2023_placement IS NOT NULL OR nhsca_2023_record IS NOT NULL THEN '2023'
    ELSE 'None'
  END as year_with_data
FROM athletes
WHERE LOWER(name) LIKE '%liam%hickey%'
   OR LOWER(name) LIKE '%hickey%liam%'
  AND (
    nhsca_2025_placement IS NOT NULL 
    OR nhsca_2025_record IS NOT NULL
    OR nhsca_2024_placement IS NOT NULL 
    OR nhsca_2024_record IS NOT NULL
    OR nhsca_2023_placement IS NOT NULL 
    OR nhsca_2023_record IS NOT NULL
  );

