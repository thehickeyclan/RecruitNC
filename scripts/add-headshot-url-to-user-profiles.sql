-- Add headshot_url to user_profiles for profile photo / messaging avatar (run in Supabase SQL Editor).
-- Idempotent: safe to run multiple times.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS headshot_url text;

COMMENT ON COLUMN user_profiles.headshot_url IS 'URL to user profile photo (headshot); used in Community/messaging avatar.';
