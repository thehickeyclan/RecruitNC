-- Check the valid_pipeline_stage constraint

SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'valid_pipeline_stage'
AND conrelid = 'college_coach_stars'::regclass;

-- Alternative: Check what values are currently used
SELECT DISTINCT pipeline_stage, COUNT(*) as count
FROM college_coach_stars
WHERE pipeline_stage IS NOT NULL
GROUP BY pipeline_stage
ORDER BY count DESC;

