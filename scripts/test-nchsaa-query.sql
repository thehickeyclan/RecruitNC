-- Test NCHSAA data for a known NC athlete

-- 1. Check if table exists and has data
SELECT COUNT(*) as total_records
FROM wrestling_nchsaa_results;

-- 2. Show sample records
SELECT 
  wrestler_name,
  year,
  place,
  classification,
  weight_class
FROM wrestling_nchsaa_results
ORDER BY year DESC
LIMIT 10;

-- 3. Try searching for a specific athlete (replace with actual name)
-- Example: search for "Lorenzo Alston" or another known athlete
SELECT 
  wrestler_name,
  year,
  place,
  classification,
  weight_class
FROM wrestling_nchsaa_results
WHERE wrestler_name ILIKE '%lorenzo%'
   OR wrestler_name ILIKE '%alston%'
ORDER BY year DESC;
