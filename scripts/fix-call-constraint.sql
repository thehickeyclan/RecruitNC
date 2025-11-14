-- Check current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'recruiting_actions'::regclass 
AND conname = 'recruiting_actions_action_type_check';

-- Drop the old constraint
ALTER TABLE recruiting_actions 
DROP CONSTRAINT IF EXISTS recruiting_actions_action_type_check;

-- Create new constraint with correct values
ALTER TABLE recruiting_actions
ADD CONSTRAINT recruiting_actions_action_type_check
CHECK (action_type IN ('call', 'email', 'text', 'visit', 'event', 'letter', 'other'));
