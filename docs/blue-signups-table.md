# Blue simple signups (isolated form)

Simple, no-auth Blue registration. Data is stored in `blue_signups`; you can merge into full profiles later (manual or script).

## Table: `blue_signups`

Run in Supabase SQL Editor:

```sql
create table if not exists public.blue_signups (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.blue_invites(id) on delete restrict,
  parent_email text not null,
  parent_first_name text not null,
  parent_last_name text not null,
  parent_phone text,
  athlete_first_name text not null,
  athlete_last_name text not null,
  athlete_graduation_year int not null,
  athlete_high_school text not null,
  athlete_wrestling_club text,
  athlete_weight_class text,
  tshirt_size text not null,
  waiver_signed_at timestamptz not null,
  promo_code_used text,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid')),
  stripe_session_id text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_blue_signups_invite on public.blue_signups(invite_id);
create index if not exists idx_blue_signups_status on public.blue_signups(status);

alter table public.blue_signups enable row level security;

create policy "Service role full access blue_signups"
  on public.blue_signups for all to service_role using (true) with check (true);
```

Flow: parent fills form → POST creates row + Stripe checkout (metadata.signup_id) → webhook sets status=paid and Stripe IDs.

**If the table already exists**, add the wrestling club column:

```sql
alter table public.blue_signups add column if not exists athlete_wrestling_club text;
```
