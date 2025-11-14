-- Check the schools table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'schools'
ORDER BY ordinal_position;

-- Check Montreat College in schools table
SELECT * FROM schools WHERE name ILIKE '%montreat%';
