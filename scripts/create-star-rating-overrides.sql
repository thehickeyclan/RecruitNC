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

-- A star set by hand without a reason is the thing this is meant to prevent.
alter table public.athletes
  drop constraint if exists athletes_star_rating_override_reason;
alter table public.athletes
  add constraint athletes_star_rating_override_reason
  check (star_rating_override is null or length(btrim(coalesce(star_rating_override_reason, ''))) >= 10);

comment on column public.athletes.star_rating_override is
  'Hand-set star rating, 1-5. Overrides the computed value and is shown as a staff rating.';
