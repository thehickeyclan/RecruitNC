-- Check current constraint on recruiting_actions
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'recruiting_actions'::regclass 
AND contype = 'c';

-- Drop the old constraint if it exists
ALTER TABLE recruiting_actions DROP CONSTRAINT IF EXISTS recruiting_actions_action_type_check;

-- Add new constraint with all valid action types
ALTER TABLE recruiting_actions 
ADD CONSTRAINT recruiting_actions_action_type_check 
CHECK (action_type IN (
  'contact',
  'phone_call',
  'email',
  'text',
  'visit',
  'camp',
  'tournament',
  'meeting',
  'offer',
  'follow_up',
  'evaluation',
  'other'
));
