-- Run in Supabase SQL Editor. Creates training expense request storage (parent + admin flows use API with service role).

create table if not exists public.athlete_expense_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  expense_type text not null,
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 100000000),
  amount_approved_cents integer null,
  payment_method text not null check (payment_method in ('zelle', 'venmo')),
  zelle_info text null,
  venmo_info text null,
  parent_notes text null,
  document_url text null,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'approved', 'rejected', 'paid')),
  admin_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  paid_at timestamptz null
);

create index if not exists idx_athlete_expense_requests_user on public.athlete_expense_requests (user_id);
create index if not exists idx_athlete_expense_requests_athlete on public.athlete_expense_requests (athlete_id);
create index if not exists idx_athlete_expense_requests_status on public.athlete_expense_requests (status);
create index if not exists idx_athlete_expense_requests_created on public.athlete_expense_requests (created_at desc);

alter table public.athlete_expense_requests enable row level security;

drop policy if exists "athlete_expense_requests_select_own" on public.athlete_expense_requests;
drop policy if exists "athlete_expense_requests_no_client_mutate" on public.athlete_expense_requests;

create policy "athlete_expense_requests_select_own" on public.athlete_expense_requests
  for select to authenticated
  using (auth.uid() = user_id);

create policy "athlete_expense_requests_no_client_mutate" on public.athlete_expense_requests
  for all to authenticated
  using (false)
  with check (false);

comment on table public.athlete_expense_requests is 'Parent training expense reimbursement requests; admin acts via /api/admin/expense-requests.';
