-- Add parent_id to forum_messages for reply-to-message (run in Supabase SQL Editor).
-- Idempotent: safe to run multiple times.

ALTER TABLE forum_messages
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES forum_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_forum_messages_parent_id ON forum_messages(parent_id) WHERE parent_id IS NOT NULL;

COMMENT ON COLUMN forum_messages.parent_id IS 'When set, this message is a reply to the message with this id.';
