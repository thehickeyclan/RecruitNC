-- Check actual column names in schools table

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'schools'
ORDER BY column_name;
