-- Safe Migration: Convert existing tournament data to JSON format
-- This preserves all existing data in old columns while populating new JSON columns

-- STEP 1: First, make sure the new columns exist
ALTER TABLE athletes 
ADD COLUMN IF NOT EXISTS nhsca_results JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS super32_results JSONB DEFAULT '[]'::jsonb;

-- STEP 2: Migrate all existing NHSCA data to JSON format
-- This creates a JSON array from the existing year-specific columns
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
WHERE nhsca_2025_placement IS NOT NULL 
   OR nhsca_2025_record IS NOT NULL
   OR nhsca_2024_placement IS NOT NULL
   OR nhsca_2024_record IS NOT NULL
   OR nhsca_2023_placement IS NOT NULL
   OR nhsca_2023_record IS NOT NULL;

-- STEP 3: Migrate all existing Super 32 data to JSON format
UPDATE athletes
SET super32_results = (
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
    SELECT 2025 as year, super_32_2025_placement as placement, super_32_2025_record as record
    WHERE super_32_2025_placement IS NOT NULL OR super_32_2025_record IS NOT NULL
    UNION ALL
    SELECT 2024 as year, super_32_2024_placement as placement, super_32_2024_record as record
    WHERE super_32_2024_placement IS NOT NULL OR super_32_2024_record IS NOT NULL
    UNION ALL
    SELECT 2023 as year, super_32_2023_placement as placement, super_32_2023_record as record
    WHERE super_32_2023_placement IS NOT NULL OR super_32_2023_record IS NOT NULL
  ) AS super32_data
)
WHERE super_32_2025_placement IS NOT NULL 
   OR super_32_2025_record IS NOT NULL
   OR super_32_2024_placement IS NOT NULL
   OR super_32_2024_record IS NOT NULL
   OR super_32_2023_placement IS NOT NULL
   OR super_32_2023_record IS NOT NULL;

-- STEP 4: Verification - Check the migration results
-- This shows athletes with tournament data in both old and new formats
SELECT 
  name,
  graduationyear,
  -- Old format
  nhsca_2025_placement as old_nhsca_2025_placement,
  nhsca_2024_placement as old_nhsca_2024_placement,
  super_32_2025_placement as old_super32_2025_placement,
  -- New format
  nhsca_results,
  super32_results
FROM athletes
WHERE nhsca_results IS NOT NULL AND nhsca_results != '[]'::jsonb
   OR super32_results IS NOT NULL AND super32_results != '[]'::jsonb
ORDER BY name
LIMIT 10;

-- STEP 5: Count how many athletes were migrated
SELECT 
  COUNT(*) FILTER (WHERE nhsca_results IS NOT NULL AND nhsca_results != '[]'::jsonb) as athletes_with_nhsca,
  COUNT(*) FILTER (WHERE super32_results IS NOT NULL AND super32_results != '[]'::jsonb) as athletes_with_super32,
  COUNT(*) FILTER (
    WHERE (nhsca_results IS NOT NULL AND nhsca_results != '[]'::jsonb)
       OR (super32_results IS NOT NULL AND super32_results != '[]'::jsonb)
  ) as total_athletes_with_tournament_data
FROM athletes;

-- STEP 6: After verifying the migration is successful, you can optionally drop old columns
-- ⚠️ DO NOT RUN THIS UNTIL YOU'VE VERIFIED THE MIGRATION IS CORRECT! ⚠️
-- 
-- ALTER TABLE athletes 
-- DROP COLUMN IF EXISTS nhsca_2025_placement,
-- DROP COLUMN IF EXISTS nhsca_2025_record,
-- DROP COLUMN IF EXISTS nhsca_2024_placement,
-- DROP COLUMN IF EXISTS nhsca_2024_record,
-- DROP COLUMN IF EXISTS nhsca_2023_placement,
-- DROP COLUMN IF EXISTS nhsca_2023_record,
-- DROP COLUMN IF EXISTS super_32_2025_placement,
-- DROP COLUMN IF EXISTS super_32_2025_record,
-- DROP COLUMN IF EXISTS super_32_2024_placement,
-- DROP COLUMN IF EXISTS super_32_2024_record,
-- DROP COLUMN IF EXISTS super_32_2023_placement,
-- DROP COLUMN IF EXISTS super_32_2023_record;

-- NOTES:
-- 1. Old columns are preserved until you manually drop them
-- 2. Division is auto-calculated based on graduation year
-- 3. Weight class is pulled from athlete's main weight class field
-- 4. All placement and record data is preserved exactly as-is
-- 5. Empty arrays ([]) mean no tournament data for that tournament
