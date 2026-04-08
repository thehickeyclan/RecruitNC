-- Spartan 2026 — roster for fundraising lookup. Run in Supabase SQL Editor.

create table if not exists public.spartan_fundraising_athletes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  first_name text,
  last_name text not null,
  grad_year int not null,
  school text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists spartan_fundraising_athletes_last_name_idx on public.spartan_fundraising_athletes (last_name);
