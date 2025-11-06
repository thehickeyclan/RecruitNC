-- Rename "Evaluating" stage to "Contacted" in pipeline
-- This updates all existing records to use the new stage name

-- Update college_coach_stars table
UPDATE college_coach_stars 
SET pipeline_stage = 'Contacted'
WHERE pipeline_stage = 'Evaluating' OR pipeline_stage = 'evaluating';

-- Verify the update
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN pipeline_stage = 'Contacted' THEN 1 END) as contacted_count,
  COUNT(CASE WHEN pipeline_stage = 'Evaluating' THEN 1 END) as evaluating_count
FROM college_coach_stars;

-- Show sample of updated records
SELECT 
  id, 
  athlete_id,
  coach_user_id,
  pipeline_stage,
  starred_at
FROM college_coach_stars
WHERE pipeline_stage = 'Contacted'
LIMIT 10;

COMMENT ON COLUMN college_coach_stars.pipeline_stage IS 'Recruiting pipeline stage: Prospect, Contacted, Recruiting, Offered, Committed, Signed, Lost';

