-- Parent-facing Blue billing notifications: send-once ledger.
--
-- WHY: invoice.payment_failed only flipped blue_memberships.status — no email, no SMS.
-- A parent whose card expired found out only if they happened to open their Profile tab,
-- and 25 of 63 signups abandoned Stripe Checkout with no follow-up. The app now sends
-- dunning + finish-registration emails; this table is what makes them send-once.
--
-- dedupe_key examples:
--   payment_failed:in_1ABC...        (one email per failed invoice — Stripe retries the
--                                     same invoice several times; parents get ONE email)
--   abandoned_nudge:<signup_id>      (one nudge ever per abandoned signup)
--
-- The code degrades gracefully if this table is missing (42P01): it still sends, but
-- cannot dedupe — bounded by Stripe's own retry count. Run this before deploying.
-- Run in: Supabase SQL Editor.

create table if not exists public.blue_billing_notifications (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  kind text not null,                 -- 'payment_failed' | 'abandoned_nudge'
  membership_id uuid,
  signup_id uuid,
  sent_to text,
  sms_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_blue_billing_notifications_kind
  on public.blue_billing_notifications (kind, created_at desc);

alter table public.blue_billing_notifications enable row level security;
-- Service role bypasses RLS; no client access needed.

grant all on table public.blue_billing_notifications to service_role;

notify pgrst, 'reload schema';

-- Verify:
select count(*) as notification_rows from public.blue_billing_notifications;
