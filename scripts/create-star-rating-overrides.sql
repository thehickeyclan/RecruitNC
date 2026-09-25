-- Hand-set star ratings.
--
-- The rating is computed from results, and that is its whole defence: every point traces to a
-- row. An override breaks that, so it is stored with the reason and the person, never as a bare
-- number — a star nobody can account for is worth less than no star.
--
-- Expected to stay rare. When several wrestlers need one, the ratings are wrong and the bands
-- or the missing data are what to fix.

alter table public.athletes
  add column if not exists star_rating_override        smallint,
  add column if not exists star_rating_override_reason text,
  add column if not exists star_rating_override_by     uuid references auth.users(id),
  add column if not exists star_rating_override_at     timestamptz;

-- One to five, or nothing.
alter table public.athletes
  drop constraint if exists athletes_star_rating_override_range;
alter table public.athletes
  add constraint athletes_star_rating_override_range
  check (star_rating_override is null or star_rating_override between 1 and 5);

-- A reason is optional. Requiring one here, in the route and in `applyStarOverride` at the same
-- time meant a star set without ten characters of justification was rejected — and when it did
-- get through, it was ignored on read, which is indistinguishable from a broken Save button.
alter table public.athletes
  drop constraint if exists athletes_star_rating_override_reason;

comment on column public.athletes.star_rating_override is
  'Hand-set star rating, 1-5. Overrides the computed value and is shown as a staff rating.';
