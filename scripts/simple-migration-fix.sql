-- Simple Migration Fix: Manually migrate tournament data to JSON
-- This version is more straightforward and handles the data conversion properly

-- STEP 1: Migrate NHSCA data for each athlete
UPDATE athletes
SET nhsca_results = (
  SELECT jsonb_agg(result ORDER BY year DESC)
  FROM (
    -- 2025 data
    SELECT 
      2025 as year,
      nhsca_2025_placement as placement,
      nhsca_2025_record as record,
      weightclass as weight,
      CASE 
        WHEN graduationyear = 2025 THEN 'Senior'
        WHEN graduationyear = 2026 THEN 'Junior'
        WHEN graduationyear = 2027 THEN 'Sophomore'
        WHEN graduationyear = 2028 THEN 'Freshman'
        ELSE ''
      END as division,
      '' as notes
    FROM athletes AS a
    WHERE athletes.id = a.id
      AND (a.nhsca_2025_placement IS NOT NULL OR a.nhsca_2025_record IS NOT NULL)
    
    UNION ALL
    
    -- 2024 data
    SELECT 
      2024 as year,
      nhsca_2024_placement as placement,
      nhsca_2024_record as record,
      weightclass as weight,
      CASE 
        WHEN graduationyear = 2024 THEN 'Senior'
        WHEN graduationyear = 2025 THEN 'Junior'
        WHEN graduationyear = 2026 THEN 'Sophomore'
        WHEN graduationyear = 2027 THEN 'Freshman'
        ELSE ''
      END as division,
      '' as notes
    FROM athletes AS a
    WHERE athletes.id = a.id
      AND (a.nhsca_2024_placement IS NOT NULL OR a.nhsca_2024_record IS NOT NULL)
    
    UNION ALL
    
    -- 2023 data
    SELECT 
      2023 as year,
      nhsca_2023_placement as placement,
      nhsca_2023_record as record,
      weightclass as weight,
      CASE 
        WHEN graduationyear = 2023 THEN 'Senior'
        WHEN graduationyear = 2024 THEN 'Junior'
        WHEN graduationyear = 2025 THEN 'Sophomore'
        WHEN graduationyear = 2026 THEN 'Freshman'
        ELSE ''
      END as division,
      '' as notes
    FROM athletes AS a
    WHERE athletes.id = a.id
      AND (a.nhsca_2023_placement IS NOT NULL OR a.nhsca_2023_record IS NOT NULL)
  ) AS result
)
WHERE nhsca_2025_placement IS NOT NULL 
   OR nhsca_2025_record IS NOT NULL
   OR nhsca_2024_placement IS NOT NULL
   OR nhsca_2024_record IS NOT NULL
   OR nhsca_2023_placement IS NOT NULL
   OR nhsca_2023_record IS NOT NULL;

-- STEP 2: Migrate Super 32 data for each athlete
UPDATE athletes
SET super32_results = (
  SELECT jsonb_agg(result ORDER BY year DESC)
  FROM (
    -- 2025 data
    SELECT 
      2025 as year,
      super_32_2025_placement as placement,
      super_32_2025_record as record,
      weightclass as weight,
      CASE 
        WHEN graduationyear = 2025 THEN 'Senior'
        WHEN graduationyear = 2026 THEN 'Junior'
        WHEN graduationyear = 2027 THEN 'Sophomore'
        WHEN graduationyear = 2028 THEN 'Freshman'
        ELSE ''
      END as division,
      '' as notes
    FROM athletes AS a
    WHERE athletes.id = a.id
      AND (a.super_32_2025_placement IS NOT NULL OR a.super_32_2025_record IS NOT NULL)
    
    UNION ALL
    
    -- 2024 data
    SELECT 
      2024 as year,
      super_32_2024_placement as placement,
      super_32_2024_record as record,
      weightclass as weight,
      CASE 
        WHEN graduationyear = 2024 THEN 'Senior'
        WHEN graduationyear = 2025 THEN 'Junior'
        WHEN graduationyear = 2026 THEN 'Sophomore'
        WHEN graduationyear = 2027 THEN 'Freshman'
        ELSE ''
      END as division,
      '' as notes
    FROM athletes AS a
    WHERE athletes.id = a.id
      AND (a.super_32_2024_placement IS NOT NULL OR a.super_32_2024_record IS NOT NULL)
    
    UNION ALL
    
    -- 2023 data
    SELECT 
      2023 as year,
      super_32_2023_placement as placement,
      super_32_2023_record as record,
      weightclass as weight,
      CASE 
        WHEN graduationyear = 2023 THEN 'Senior'
        WHEN graduationyear = 2024 THEN 'Junior'
        WHEN graduationyear = 2025 THEN 'Sophomore'
        WHEN graduationyear = 2026 THEN 'Freshman'
        ELSE ''
      END as division,
      '' as notes
    FROM athletes AS a
    WHERE athletes.id = a.id
      AND (a.super_32_2023_placement IS NOT NULL OR a.super_32_2023_record IS NOT NULL)
  ) AS result
)
WHERE super_32_2025_placement IS NOT NULL 
   OR super_32_2025_record IS NOT NULL
   OR super_32_2024_placement IS NOT NULL
   OR super_32_2024_record IS NOT NULL
   OR super_32_2023_placement IS NOT NULL
   OR super_32_2023_record IS NOT NULL;

-- STEP 3: Verify the migration for Bentley Sly
SELECT 
  name,
  graduationyear,
  nhsca_results,
  super32_results
FROM athletes
WHERE name ILIKE '%Bentley%Sly%';

-- STEP 4: Count migrated athletes
SELECT 
  COUNT(*) FILTER (WHERE nhsca_results IS NOT NULL AND nhsca_results != '[]'::jsonb) as athletes_with_nhsca_migrated,
  COUNT(*) FILTER (WHERE super32_results IS NOT NULL AND super32_results != '[]'::jsonb) as athletes_with_super32_migrated
FROM athletes;

