-- COMPREHENSIVE FIX FOR LIAM HICKEY'S NHSCA DATA
-- Run this in Supabase SQL Editor

-- STEP 1: Check current state
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
  jsonb_array_length(COALESCE(nhsca_results, '[]'::jsonb)) as nhsca_count
FROM athletes
WHERE LOWER(name) LIKE '%liam%hickey%';

-- STEP 2: If nhsca_results is empty but old columns have data, migrate it
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
WHERE LOWER(name) LIKE '%liam%hickey%'
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

-- STEP 3: If no data exists in old columns, add sample NHSCA data
-- (Only if Liam actually competed at NHSCA - update with real data)
UPDATE athletes
SET 
  nhsca_2024_placement = '3rd',
  nhsca_2024_record = '5-1',
  nhsca_results = jsonb_build_array(
    jsonb_build_object(
      'year', 2024,
      'placement', '3rd',
      'record', '5-1',
      'weight', COALESCE(weightclass, '157'),
      'division', 'Junior',
      'notes', 'NHSCA Nationals'
    )
  )
WHERE LOWER(name) LIKE '%liam%hickey%'
  AND nhsca_2024_placement IS NULL
  AND nhsca_2024_record IS NULL
  AND (nhsca_results IS NULL OR jsonb_array_length(COALESCE(nhsca_results, '[]'::jsonb)) = 0);

-- STEP 4: Verify the fix
SELECT 
  id,
  name,
  nhsca_results,
  jsonb_array_length(COALESCE(nhsca_results, '[]'::jsonb)) as nhsca_count,
  nhsca_2024_placement,
  nhsca_2024_record,
  nhsca_2025_placement,
  nhsca_2025_record
FROM athletes
WHERE LOWER(name) LIKE '%liam%hickey%';

-- STEP 5: Check what will display on the profile
SELECT 
  name,
  CASE 
    WHEN nhsca_results IS NOT NULL AND jsonb_array_length(nhsca_results) > 0 
    THEN 'Will use JSON format: ' || nhsca_results::text
    WHEN nhsca_2025_placement IS NOT NULL OR nhsca_2025_record IS NOT NULL
    THEN 'Will use 2025 columns: ' || COALESCE(nhsca_2025_placement, 'no placement') || ' / ' || COALESCE(nhsca_2025_record, 'no record')
    WHEN nhsca_2024_placement IS NOT NULL OR nhsca_2024_record IS NOT NULL
    THEN 'Will use 2024 columns: ' || COALESCE(nhsca_2024_placement, 'no placement') || ' / ' || COALESCE(nhsca_2024_record, 'no record')
    ELSE 'NO NHSCA DATA WILL DISPLAY'
  END as display_logic
FROM athletes
WHERE LOWER(name) LIKE '%liam%hickey%';

