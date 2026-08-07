create table if not exists public.toc_college_coaches (
  id uuid primary key default gen_random_uuid(),
  coach_name text not null,
  college_program text not null,
  state text,
  email text not null unique,
  mobile_phone text,
  attendance text check (attendance is null or attendance in ('friday', 'saturday', 'both')),
  staff_count integer check (staff_count is null or staff_count between 1 and 12),
  status text not null default 'contact' check (status in ('contact', 'invited', 'registered', 'confirmed', 'declined')),
  source text not null default 'import',
  opted_out boolean not null default false,
  registered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.toc_college_coaches add column if not exists state text;

create index if not exists toc_college_coaches_status_created
  on public.toc_college_coaches (status, created_at desc);

alter table public.toc_college_coaches enable row level security;
drop policy if exists "Service role full toc_college_coaches" on public.toc_college_coaches;
create policy "Service role full toc_college_coaches"
  on public.toc_college_coaches for all to service_role using (true) with check (true);
