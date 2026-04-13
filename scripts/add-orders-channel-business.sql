-- Run in Supabase SQL Editor: canonical channel/business from Stripe metadata on orders.
-- Safe to run once.

alter table public.orders
  add column if not exists channel text;

alter table public.orders
  add column if not exists business text;

create index if not exists idx_orders_channel on public.orders (channel);
create index if not exists idx_orders_business on public.orders (business);

comment on column public.orders.channel is 'Canonical business channel from Stripe metadata: store, recruitnc, spartan, blue, drop_in';
comment on column public.orders.business is 'Canonical business entity from Stripe metadata: nc_united, guild';
