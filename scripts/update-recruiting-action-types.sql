-- Update recruiting_actions.action_type constraint to include new activity categories
ALTER TABLE recruiting_actions
DROP CONSTRAINT IF EXISTS recruiting_actions_action_type_check;

ALTER TABLE recruiting_actions
ADD CONSTRAINT recruiting_actions_action_type_check
CHECK (
  action_type IN (
    'call',
    'text',
    'email',
    'visit',
    'event',
    'letter',
    'other',
    'prospect_camp',
    'watched_live',
    'social_media'
  )
);

COMMENT ON CONSTRAINT recruiting_actions_action_type_check ON recruiting_actions
IS 'Allowed activity types for recruiting_actions table';
