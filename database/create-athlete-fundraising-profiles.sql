-- athlete_fundraising_profiles: permanent public fundraising pages (separate from recruiting).
-- Run in Supabase SQL Editor. Slugs must be lowercase URL segments (e.g. ncu-smith-27 or custom jane-doe).

create table if not exists public.athlete_fundraising_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  slug text not null,
  bio text,
  photo_url text,
  is_active boolean not null default true,
  campaign_goal_cents integer,
  total_raised_cents integer,
  primary_fundraising_code text,
  constraint athlete_fundraising_profiles_slug_lower check (length(trim(slug)) >= 2 and slug = lower(trim(slug))),
  constraint athlete_fundraising_profiles_slug_shape check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint athlete_fundraising_profiles_athlete_unique unique (athlete_id),
  constraint athlete_fundraising_profiles_slug_unique unique (slug)
);

create index if not exists idx_athlete_fundraising_profiles_athlete_id
  on public.athlete_fundraising_profiles (athlete_id);

create index if not exists idx_athlete_fundraising_profiles_active
  on public.athlete_fundraising_profiles (is_active)
  where is_active = true;

comment on table public.athlete_fundraising_profiles is
  'NC United donor-facing profile metadata; money totals stay in Stripe mirror + app aggregation.';

comment on column public.athlete_fundraising_profiles.primary_fundraising_code is
  'Optional NCU-… code when roster-derived code should be overridden or athlete is off roster.';

alter table public.athlete_fundraising_profiles enable row level security;

create policy "Anyone can read active fundraising profiles"
  on public.athlete_fundraising_profiles
  for select
  using (is_active = true);

-- Inserts/updates: use service role (admin client) or add authenticated admin policies later.
