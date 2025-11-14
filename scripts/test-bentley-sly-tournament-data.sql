-- Test: Add sample tournament data for Bentley Sly
-- This demonstrates the new JSON structure for tournament results

-- First, let's find Bentley Sly's ID
SELECT id, name, graduationyear 
FROM athletes 
WHERE name ILIKE '%Bentley%Sly%';

-- Example update (replace 'ATHLETE_ID_HERE' with actual ID from above query)
-- UPDATE athletes
-- SET 
--   nhsca_results = '[
--     {
--       "year": 2025,
--       "placement": "3rd",
--       "record": "5-1",
--       "weight": "157",
--       "division": "Senior",
--       "notes": ""
--     },
--     {
--       "year": 2024,
--       "placement": "5th",
--       "record": "4-2",
--       "weight": "152",
--       "division": "Junior",
--       "notes": "Competed up a weight class"
--     }
--   ]'::jsonb,
--   super32_results = '[
--     {
--       "year": 2025,
--       "placement": "Champion",
--       "record": "6-0",
--       "weight": "157",
--       "division": "Senior",
--       "notes": "Dominated the bracket"
--     },
--     {
--       "year": 2024,
--       "placement": "Finalist",
--       "record": "5-1",
--       "weight": "152",
--       "division": "Junior",
--       "notes": ""
--     }
--   ]'::jsonb
-- WHERE id = 'ATHLETE_ID_HERE';

-- Verify the update
-- SELECT 
--   id,
--   name,
--   nhsca_results,
--   super32_results
-- FROM athletes
-- WHERE id = 'ATHLETE_ID_HERE';
