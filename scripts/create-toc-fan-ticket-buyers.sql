-- Everyone who bought a TOC fan ticket on GoFan, so Messenger can reach buyers who have no
-- RecruitNC account. One row per email: a family buying four passes is one person to write to.
--
-- Kept apart from toc_coach_ticket_purchases on purpose. That table drives who holds a coach
-- credential; fan buyers in it would read as credentialed coaches.

create table if not exists public.toc_fan_ticket_buyers (
  email text primary key,
  first_name text,
  last_name text,
  tickets integer not null default 1,
  last_purchased_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A buyer list is not public. No policies: only the service role (admin routes) can read it.
alter table public.toc_fan_ticket_buyers enable row level security;
