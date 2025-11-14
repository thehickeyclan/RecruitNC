-- Check actual column names in athlete_profile_submissions table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'athlete_profile_submissions'
ORDER BY ordinal_position;
