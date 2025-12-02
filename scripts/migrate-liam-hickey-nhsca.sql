-- Migrate Liam Hickey's NHSCA data from old columns to JSON format
-- This will only update if nhsca_results is NULL or empty AND old columns have data

UPDATE athletes
SET nhsca_results = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'year', year,
      'placement', placement,
      'record', record,
      'weight', COALESCE(weightclass, ''),
      'division', 
        CASE 
          WHEN graduationyear - year = 0 THEN 'Senior'
          WHEN graduationyear - year = 1 THEN 'Junior'
          WHEN graduationyear - year = 2 THEN 'Sophomore'
          WHEN graduationyear - year = 3 THEN 'Freshman'
          ELSE ''
        END,
      'notes', ''
    )
  )
  FROM (
    SELECT 2025 as year, nhsca_2025_placement as placement, nhsca_2025_record as record
    WHERE nhsca_2025_placement IS NOT NULL OR nhsca_2025_record IS NOT NULL
    UNION ALL
    SELECT 2024 as year, nhsca_2024_placement as placement, nhsca_2024_record as record
    WHERE nhsca_2024_placement IS NOT NULL OR nhsca_2024_record IS NOT NULL
    UNION ALL
    SELECT 2023 as year, nhsca_2023_placement as placement, nhsca_2023_record as record
    WHERE nhsca_2023_placement IS NOT NULL OR nhsca_2023_record IS NOT NULL
  ) AS nhsca_data
)
WHERE (LOWER(name) LIKE '%liam%hickey%' OR LOWER(name) LIKE '%hickey%liam%')
  AND (
    nhsca_results IS NULL 
    OR nhsca_results = '[]'::jsonb
    OR jsonb_array_length(COALESCE(nhsca_results, '[]'::jsonb)) = 0
  )
  AND (
    nhsca_2025_placement IS NOT NULL 
    OR nhsca_2025_record IS NOT NULL
    OR nhsca_2024_placement IS NOT NULL 
    OR nhsca_2024_record IS NOT NULL
    OR nhsca_2023_placement IS NOT NULL 
    OR nhsca_2023_record IS NOT NULL
  );

-- Verify the update
SELECT 
  id,
  name,
  nhsca_results,
  jsonb_array_length(COALESCE(nhsca_results, '[]'::jsonb)) as nhsca_results_count,
  nhsca_2025_placement,
  nhsca_2025_record,
  nhsca_2024_placement,
  nhsca_2024_record
FROM athletes
WHERE LOWER(name) LIKE '%liam%hickey%'
   OR LOWER(name) LIKE '%hickey%liam%';

