-- Days in stage (22 Oct 2026): when each college on a family's list entered its current stage.
-- Existing rows start from their last update, the best date we have.
alter table public.college_list_items add column if not exists stage_changed_at timestamptz;
update public.college_list_items set stage_changed_at = updated_at where stage_changed_at is null;
