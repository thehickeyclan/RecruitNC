-- The Command Center plan (Matt, 15 Oct 2026): $24.99/month, the recruiting portal without Blue.
-- recruitnc_subscriptions holds one subscription per account; `plan` says which. Existing rows are
-- the Rankings plan. Safe to run more than once. The Command Center button on /rankings and /plans
-- switches from "Coming soon" to on sale once this column exists.
alter table public.recruitnc_subscriptions
  add column if not exists plan text not null default 'rankings'
  check (plan in ('rankings', 'command_center'));
