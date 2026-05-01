-- Optional: active fundraising campaigns for /fundraising hub cards (fallback uses campaign-registry).
create table if not exists public.fundraising_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  title text,
  status text not null default 'draft',
  partner_logo_url text,
  hero_image_url text,
  goal_cents bigint,
  ends_at timestamptz,
  public_path text,
  stripe_campaign_slug text,
  sort_order int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_fundraising_campaigns_status on public.fundraising_campaigns (status);
