-- Diagnostic Script: Check Migration Status

-- 1. Check if new columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'athletes' 
AND column_name IN ('nhsca_results', 'super32_results');

-- 2. Check what old tournament columns actually exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'athletes' 
AND (
  column_name LIKE 'nhsca_%' 
  OR column_name LIKE 'super_32_%'
  OR column_name LIKE 'super32_%'
)
ORDER BY column_name;

-- 3. Check Bentley Sly's current data (both old and new formats)
SELECT 
  id,
  name,
  -- New JSON columns
  nhsca_results,
  super32_results,
  -- Old columns (2025)
  nhsca_2025_record,
  nhsca_2025_placement,
  super_32_2025_record,
  super_32_2025_placement,
  -- Old columns (2024)
  nhsca_2024_record,
  nhsca_2024_placement,
  super_32_2024_record,
  super_32_2024_placement,
  -- Old columns (2023)
  nhsca_2023_record,
  nhsca_2023_placement,
  super_32_2023_record,
  super_32_2023_placement
FROM athletes
WHERE name ILIKE '%Bentley%Sly%';

-- 4. Count athletes with old tournament data
SELECT 
  COUNT(*) FILTER (WHERE nhsca_2025_placement IS NOT NULL OR nhsca_2025_record IS NOT NULL) as has_nhsca_2025,
  COUNT(*) FILTER (WHERE nhsca_2024_placement IS NOT NULL OR nhsca_2024_record IS NOT NULL) as has_nhsca_2024,
  COUNT(*) FILTER (WHERE super_32_2025_placement IS NOT NULL OR super_32_2025_record IS NOT NULL) as has_super32_2025,
  COUNT(*) FILTER (WHERE super_32_2024_placement IS NOT NULL OR super_32_2024_record IS NOT NULL) as has_super32_2024,
  COUNT(*) FILTER (WHERE nhsca_results IS NOT NULL AND nhsca_results != '[]'::jsonb) as has_nhsca_json,
  COUNT(*) FILTER (WHERE super32_results IS NOT NULL AND super32_results != '[]'::jsonb) as has_super32_json
FROM athletes;

