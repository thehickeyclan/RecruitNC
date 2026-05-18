-- RecruitNC: persist Guild parent id on each allocation (run in Supabase SQL editor)

ALTER TABLE public.guild_credit_allocations
  ADD COLUMN IF NOT EXISTS guild_parent_user_id_at_grant uuid;

COMMENT ON COLUMN public.guild_credit_allocations.guild_parent_user_id_at_grant IS
  'Guild parent UUID for this transfer; enables self-heal of user_profiles.guild_parent_user_id.';
