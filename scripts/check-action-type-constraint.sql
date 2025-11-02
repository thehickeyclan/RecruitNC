-- Check what values are allowed in the action_type constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'recruiting_actions'::regclass 
AND conname = 'recruiting_actions_action_type_check';

-- If the constraint is wrong, drop it and recreate with correct values
ALTER TABLE recruiting_actions DROP CONSTRAINT IF EXISTS recruiting_actions_action_type_check;

ALTER TABLE recruiting_actions ADD CONSTRAINT recruiting_actions_action_type_check 
CHECK (action_type = ANY (ARRAY['call'::text, 'text'::text, 'email'::text, 'visit'::text, 'event'::text, 'note'::text, 'other'::text]));
