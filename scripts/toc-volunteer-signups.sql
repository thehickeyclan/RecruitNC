-- TOC volunteer signups — run in Supabase SQL Editor (safe to re-run).

create table if not exists public.toc_volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  role_interest text,
  availability text[] not null default '{}',
  message text,
  status text check (status in ('new','contacted','confirmed','declined')) default 'new',
  created_at timestamptz default current_timestamp
);

create index if not exists idx_toc_volunteer_status on public.toc_volunteer_signups(status, created_at desc);

alter table public.toc_volunteer_signups enable row level security;

drop policy if exists "Service role full toc_volunteer_signups" on public.toc_volunteer_signups;
create policy "Service role full toc_volunteer_signups"
  on public.toc_volunteer_signups for all to service_role using (true) with check (true);
