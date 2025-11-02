-- Migration: Remove "Contacted" stage and add "Signed" stage
-- This script moves all "Contacted" athletes to "Evaluating" stage
-- since contact tracking is now handled by the activity system

-- Update all "Contacted" records to "Evaluating"
UPDATE college_coach_stars
SET pipeline_stage = 'Evaluating'
WHERE pipeline_stage = 'Contacted';

-- Log the changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % athletes from Contacted to Evaluating', updated_count;
END $$;
