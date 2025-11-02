-- Test inserting an activity to diagnose the issue
-- Replace these values with actual IDs from your database

INSERT INTO recruiting_actions (
  athlete_id,
  coach_user_id,
  action_type,
  action_date,
  description,
  outcome
) VALUES (
  '969fb4a7-fe96-4b95-bf3e-4adf2a3d16f8', -- athlete_id from the logs
  (SELECT user_id FROM user_profiles WHERE is_admin = true LIMIT 1), -- Get a coach user_id
  'call',
  NOW(),
  'Test activity',
  'Test outcome'
);

-- Check if it was inserted
SELECT * FROM recruiting_actions WHERE description = 'Test activity';
