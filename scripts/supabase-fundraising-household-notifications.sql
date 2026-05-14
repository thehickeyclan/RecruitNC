-- Run in Supabase SQL Editor (production): gift-page household alerts + optional activation SMS opt-in.
-- Donation email + SMS alerts default ON; parents turn off under Profile → Fundraising notifications.

alter table public.user_profiles
  add column if not exists notify_email_fundraising_gifts boolean not null default true;

alter table public.user_profiles
  add column if not exists notify_sms_fundraising_gifts boolean not null default true;

alter table public.user_profiles
  add column if not exists notify_sms_fundraising_activation boolean not null default false;

comment on column public.user_profiles.notify_email_fundraising_gifts is
  'When true, linked household receives email when someone gives on this athlete''s NC United gift page.';

comment on column public.user_profiles.notify_sms_fundraising_gifts is
  'When true and cell_phone is set, SMS alerts for new gifts on linked athlete gift pages (default on; turn off in profile).';

comment on column public.user_profiles.notify_sms_fundraising_activation is
  'When true and cell_phone is set, optional SMS when staff approves fundraising page activation.';

-- Idempotent: one household-notification attempt per Stripe Checkout session (webhook retries).
create table if not exists public.fundraising_household_gift_notify_log (
  checkout_session_id text primary key,
  created_at timestamptz not null default now()
);

alter table public.fundraising_household_gift_notify_log enable row level security;

-- Deployments that already ran this script with notify_sms_fundraising_gifts default false:
-- updates default for new rows only; existing rows keep their stored value.
alter table public.user_profiles
  alter column notify_sms_fundraising_gifts set default true;
