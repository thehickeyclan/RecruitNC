-- Coach credentials bought at GoFan, so the coaches page can say who has actually collected one.
--
-- Keyed on the GoFan order number: the same export can be pasted twice, and a later export that
-- repeats earlier orders costs nothing.
--
-- linked_coach_key is set by an admin when a buyer checked out under an address we do not hold
-- against that coach. It is never written by the importer, so a re-import cannot lose it.

create table if not exists public.toc_coach_ticket_purchases (
  order_id text primary key,
  email text not null,
  purchased_at date,
  ticket_type text,
  status text,
  linked_coach_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists toc_coach_ticket_purchases_email_idx
  on public.toc_coach_ticket_purchases (lower(email));

-- A list of who bought a coach credential is not something to leave readable. No policies are
-- added, so anonymous and signed-in clients get nothing; the admin routes use the service role.
alter table public.toc_coach_ticket_purchases enable row level security;
