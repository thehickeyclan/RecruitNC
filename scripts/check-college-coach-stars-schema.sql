-- Check all columns in college_coach_stars table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'college_coach_stars'
ORDER BY ordinal_position;

