-- Check Aiden White's tournament data

SELECT 
  id,
  name,
  graduationyear,
  -- New JSON columns
  nhsca_results,
  super32_results,
  -- Old columns
  nhsca_2024_record,
  nhsca_2024_placement,
  super_32_2025_record,
  super_32_2025_placement,
  super_32_2024_record,
  super_32_2024_placement
FROM athletes
WHERE id = 'a95c204d-785c-427a-98cf-1930410b0dc7';

