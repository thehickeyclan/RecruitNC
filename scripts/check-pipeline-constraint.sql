-- Check the valid_pipeline_stage constraint definition
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'valid_pipeline_stage';

-- Also check what values currently exist in the pipeline_stage column
SELECT DISTINCT pipeline_stage
FROM college_coach_stars
WHERE pipeline_stage IS NOT NULL
ORDER BY pipeline_stage;
