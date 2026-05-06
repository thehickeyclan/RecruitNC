-- Run once in Supabase SQL Editor: warm leads from /fundraising Training Scholarships notify form.
-- API uses service role only.

create table if not exists public.fundraising_scholarship_interest_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  source text not null default 'hub_scholarships_card'
);

create unique index if not exists fundraising_scholarship_interest_signups_email_key
  on public.fundraising_scholarship_interest_signups (lower(trim(email)));

alter table public.fundraising_scholarship_interest_signups enable row level security;
