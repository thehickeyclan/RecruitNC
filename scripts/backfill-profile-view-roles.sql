-- Backfill viewer role onto historical profile/card view events.
--
-- WHY: user_analytics.event_data recorded `profile_type`, which nobody maintains — 13 of 14
-- college coaches carry profile_type 'fan' while their role is 'college_coach'. So ~88% of
-- coach views were filed as fan views. As of the accompanying code change, new events record
-- viewer_role / viewer_kind / is_coach / is_college_coach / verified_coach. This script
-- applies the same classification to the ~6k events already stored.
--
-- Nothing is lost: user_analytics.user_id was always recorded, so history is recoverable.
-- profile_type is left untouched (app/admin/card-analytics still reads it).
--
-- Classification MUST match lib/viewer-role.ts. If you change one, change both.
--   - roles are stored in BOTH spellings ('college-coach' and 'college_coach'), so normalize
--     by folding spaces/hyphens to underscores before comparing
--   - admins are NOT coaches here (they account for ~1k views); that's deliberate and differs
--     from contexts/auth-context.tsx's isCoach, which folds admin in for permissions
--   - bare 'coach' reads as high-school/club
--
-- Safe to re-run: it recomputes from user_profiles every time.
-- Run in: Supabase SQL Editor.

begin;

-- 1) Signed-in viewers: classify from user_profiles.role.
with normalized as (
  select
    ua.id,
    regexp_replace(lower(btrim(coalesce(up.role, ''))), '[[:space:]-]+', '_', 'g') as role_norm,
    coalesce(up.verified_coach, false) as verified_coach
  from public.user_analytics ua
  join public.user_profiles up on up.user_id = ua.user_id
  where ua.user_id is not null
    and ua.event_type in ('profile_view', 'card_view', 'card_click')
),
classified as (
  select
    id,
    verified_coach,
    case when role_norm = '' then 'unknown' else role_norm end as viewer_role,
    case
      when role_norm = 'admin' then 'admin'
      when role_norm = 'college_coach' then 'college_coach'
      when role_norm in ('hs_club_coach', 'coach', 'club_coach', 'hs_coach') then 'hs_coach'
      when role_norm = 'athlete' then 'athlete'
      when role_norm = 'parent' then 'parent'
      when role_norm = 'fan' then 'fan'
      else 'other'
    end as viewer_kind
  from normalized
)
update public.user_analytics ua
set event_data = coalesce(ua.event_data, '{}'::jsonb) || jsonb_build_object(
  'viewer_role',      c.viewer_role,
  'viewer_kind',      c.viewer_kind,
  'is_coach',         c.viewer_kind in ('college_coach', 'hs_coach'),
  'is_college_coach', c.viewer_kind = 'college_coach',
  'verified_coach',   c.verified_coach
)
from classified c
where ua.id = c.id;

-- 2) Signed-in viewers with no user_profiles row (a handful) — mark them, don't guess.
update public.user_analytics ua
set event_data = coalesce(ua.event_data, '{}'::jsonb) || jsonb_build_object(
  'viewer_role', 'unknown',
  'viewer_kind', 'other',
  'is_coach', false,
  'is_college_coach', false,
  'verified_coach', false
)
where ua.user_id is not null
  and ua.event_type in ('profile_view', 'card_view', 'card_click')
  and not exists (select 1 from public.user_profiles up where up.user_id = ua.user_id);

-- 3) Signed-out viewers.
update public.user_analytics ua
set event_data = coalesce(ua.event_data, '{}'::jsonb) || jsonb_build_object(
  'viewer_role', 'anonymous',
  'viewer_kind', 'anonymous',
  'is_coach', false,
  'is_college_coach', false,
  'verified_coach', false
)
where ua.user_id is null
  and ua.event_type in ('profile_view', 'card_view', 'card_click');

commit;

-- Speeds up "views for this athlete" and the coach filters. 6k rows doesn't need it today,
-- but the athlete-facing panel will query per athlete on every profile load.
create index if not exists idx_user_analytics_event_data_gin
  on public.user_analytics using gin (event_data);
create index if not exists idx_user_analytics_event_type_created
  on public.user_analytics (event_type, created_at desc);

-- ── Verify ────────────────────────────────────────────────────────────────────────────────
-- Expected on the data as of 2026-07-16: ~325 coach views (~179 college) across 6,147
-- profile_view events — versus the 39 the old profile_type column claimed.

-- What the OLD column claimed vs. what role actually says:
select
  count(*) filter (where event_data->>'profile_type' ilike '%coach%') as old_profile_type_says_coach,
  count(*) filter (where (event_data->>'is_coach')::boolean)          as role_says_coach,
  count(*) filter (where (event_data->>'is_college_coach')::boolean)  as college_coach_views,
  count(*)                                                            as total_profile_views
from public.user_analytics
where event_type = 'profile_view';

-- Full breakdown by viewer kind:
select event_data->>'viewer_kind' as viewer_kind, count(*) as views
from public.user_analytics
where event_type = 'profile_view'
group by 1
order by views desc;

-- Any rows the backfill missed (should be 0):
select count(*) as unclassified
from public.user_analytics
where event_type in ('profile_view', 'card_view', 'card_click')
  and event_data->>'viewer_kind' is null;
