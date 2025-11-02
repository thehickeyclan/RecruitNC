-- Drop the old constraint that only allows "Prospect"
ALTER TABLE college_coach_stars 
DROP CONSTRAINT IF EXISTS valid_pipeline_stage;

-- Added "Lost" to the allowed pipeline stages
-- Add new constraint that allows all pipeline stages including Lost
ALTER TABLE college_coach_stars 
ADD CONSTRAINT valid_pipeline_stage 
CHECK (pipeline_stage IN ('Prospect', 'Contacted', 'Evaluating', 'Recruiting', 'Offered', 'Committed', 'Lost'));
