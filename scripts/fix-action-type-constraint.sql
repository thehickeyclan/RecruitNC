-- Drop the existing constraint that's rejecting "call"
ALTER TABLE recruiting_actions DROP CONSTRAINT IF EXISTS recruiting_actions_action_type_check;

-- Add the correct constraint that allows all action types including "call"
ALTER TABLE recruiting_actions ADD CONSTRAINT recruiting_actions_action_type_check 
CHECK (action_type IN ('call', 'email', 'text', 'visit', 'event', 'letter', 'other'));
