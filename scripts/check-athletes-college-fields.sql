-- Check what college-related weight fields exist in athletes table

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'athletes'
AND (
  column_name ILIKE '%college%' OR
  column_name ILIKE '%weight%'
)
ORDER BY column_name;

-- Show all columns for Jalen to see exact field names
SELECT *
FROM athletes
WHERE name ILIKE '%Jalen%Bethea%'
LIMIT 1;
