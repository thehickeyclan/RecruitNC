-- Delete ALL forum groups and all related data. Run in Supabase SQL Editor.
-- After this, recreate "NHSCA Duals 2026" from Community → Create group.

DELETE FROM forum_message_reactions;
DELETE FROM forum_messages;
DELETE FROM forum_invite_links;
DELETE FROM forum_members;
DELETE FROM forum_channels;
DELETE FROM forum_groups;
