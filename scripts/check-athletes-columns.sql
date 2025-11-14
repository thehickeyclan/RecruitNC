-- Check actual column names in athletes table

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'athletes'
ORDER BY column_name;
