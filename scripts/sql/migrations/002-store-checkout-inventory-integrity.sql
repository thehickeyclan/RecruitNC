begin;

alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null;

create index if not exists order_items_variant_id_idx
  on public.order_items (variant_id);

create table if not exists public.store_inventory_reservations (
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  status text not null default 'pending' check (status in ('pending', 'consumed', 'released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (order_id, variant_id)
);

create index if not exists store_inventory_reservations_active_idx
  on public.store_inventory_reservations (variant_id, expires_at)
  where status = 'pending';

create table if not exists public.store_checkout_fulfillments (
  order_id uuid primary key references public.orders(id) on delete cascade,
  fulfilled_at timestamptz not null default now()
);

create table if not exists public.store_promo_reservations (
  order_id uuid primary key references public.orders(id) on delete cascade,
  promo_code text not null,
  status text not null default 'pending' check (status in ('pending', 'consumed', 'released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_promo_reservations_active_idx
  on public.store_promo_reservations (promo_code, expires_at)
  where status = 'pending';

alter table public.store_inventory_reservations enable row level security;
alter table public.store_checkout_fulfillments enable row level security;
alter table public.store_promo_reservations enable row level security;

revoke all on public.store_inventory_reservations from anon, authenticated;
revoke all on public.store_checkout_fulfillments from anon, authenticated;
revoke all on public.store_promo_reservations from anon, authenticated;
grant all on public.store_inventory_reservations to service_role;
grant all on public.store_checkout_fulfillments to service_role;
grant all on public.store_promo_reservations to service_role;

create or replace function public.reserve_store_order_inventory(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  line record;
  current_stock integer;
  other_reserved integer;
  order_promo text;
  promo_max_uses integer;
  promo_current_uses integer;
  promo_reserved integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_order_id::text, 0));

  if exists (
    select 1 from public.store_checkout_fulfillments where order_id = p_order_id
  ) then
    return;
  end if;

  if not exists (select 1 from public.orders where id = p_order_id and status = 'pending') then
    raise exception 'Order % is not pending', p_order_id;
  end if;

  if not exists (select 1 from public.order_items where order_id = p_order_id) then
    raise exception 'Order % has no line items', p_order_id;
  end if;

  if exists (
    select 1 from public.order_items where order_id = p_order_id and variant_id is null
  ) then
    raise exception 'Order % has a line item without a variant', p_order_id;
  end if;

  for line in
    select variant_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = p_order_id and variant_id is not null
    group by variant_id
    order by variant_id
  loop
    select stock_quantity
      into current_stock
      from public.product_variants
      where id = line.variant_id
      for update;

    if current_stock is null then
      raise exception 'Variant % no longer exists', line.variant_id;
    end if;

    select coalesce(sum(quantity), 0)::integer
      into other_reserved
      from public.store_inventory_reservations
      where variant_id = line.variant_id
        and order_id <> p_order_id
        and status = 'pending'
        and expires_at > now();

    if current_stock - other_reserved < line.quantity then
      raise exception 'Insufficient inventory for variant %', line.variant_id;
    end if;

    insert into public.store_inventory_reservations (
      order_id, variant_id, quantity, status, expires_at, updated_at
    ) values (
      p_order_id, line.variant_id, line.quantity, 'pending', now() + interval '60 minutes', now()
    )
    on conflict (order_id, variant_id) do update
      set quantity = excluded.quantity,
          status = 'pending',
          expires_at = excluded.expires_at,
          updated_at = now();
  end loop;

  select promo_code into order_promo from public.orders where id = p_order_id;
  if coalesce(trim(order_promo), '') <> '' then
    select max_uses, coalesce(current_uses, 0)
      into promo_max_uses, promo_current_uses
      from public.promo_codes
      where upper(code) = upper(order_promo)
      for update;

    if not found then
      raise exception 'Promo code % no longer exists', order_promo;
    end if;

    select count(*)::integer
      into promo_reserved
      from public.store_promo_reservations
      where upper(promo_code) = upper(order_promo)
        and order_id <> p_order_id
        and status = 'pending'
        and expires_at > now();

    if promo_max_uses is not null and promo_current_uses + promo_reserved >= promo_max_uses then
      raise exception 'Promo code % usage limit reached', order_promo;
    end if;

    insert into public.store_promo_reservations (
      order_id, promo_code, status, expires_at, updated_at
    ) values (
      p_order_id, order_promo, 'pending', now() + interval '60 minutes', now()
    )
    on conflict (order_id) do update
      set promo_code = excluded.promo_code,
          status = 'pending',
          expires_at = excluded.expires_at,
          updated_at = now();
  end if;
end;
$$;

create or replace function public.consume_store_order_inventory(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation record;
  current_stock integer;
  order_promo text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_order_id::text, 0));

  if exists (
    select 1 from public.store_checkout_fulfillments where order_id = p_order_id
  ) then
    return;
  end if;

  if not exists (
    select 1
    from public.store_inventory_reservations
    where order_id = p_order_id and status = 'pending'
  ) then
    raise exception 'No active inventory reservation for order %', p_order_id;
  end if;

  for reservation in
    select variant_id, quantity
    from public.store_inventory_reservations
    where order_id = p_order_id and status = 'pending'
    order by variant_id
    for update
  loop
    select stock_quantity
      into current_stock
      from public.product_variants
      where id = reservation.variant_id
      for update;

    if current_stock is null or current_stock < reservation.quantity then
      raise exception 'Insufficient inventory for variant %', reservation.variant_id;
    end if;

    update public.product_variants
      set stock_quantity = stock_quantity - reservation.quantity
      where id = reservation.variant_id;

    update public.store_inventory_reservations
      set status = 'consumed', updated_at = now()
      where order_id = p_order_id and variant_id = reservation.variant_id;
  end loop;

  select promo_code into order_promo from public.orders where id = p_order_id;
  if coalesce(trim(order_promo), '') <> '' then
    if not exists (
      select 1 from public.store_promo_reservations
      where order_id = p_order_id and status = 'pending'
    ) then
      raise exception 'No active promo reservation for order %', p_order_id;
    end if;

    update public.promo_codes
      set current_uses = coalesce(current_uses, 0) + 1
      where upper(code) = upper(order_promo);

    update public.store_promo_reservations
      set status = 'consumed', updated_at = now()
      where order_id = p_order_id and status = 'pending';
  end if;

  insert into public.store_checkout_fulfillments (order_id)
    values (p_order_id)
    on conflict (order_id) do nothing;
end;
$$;

create or replace function public.release_store_order_inventory(p_order_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.store_inventory_reservations
    set status = 'released', updated_at = now()
    where order_id = p_order_id and status = 'pending';

  update public.store_promo_reservations
    set status = 'released', updated_at = now()
    where order_id = p_order_id and status = 'pending';
$$;

revoke all on function public.reserve_store_order_inventory(uuid) from public, anon, authenticated;
revoke all on function public.consume_store_order_inventory(uuid) from public, anon, authenticated;
revoke all on function public.release_store_order_inventory(uuid) from public, anon, authenticated;
grant execute on function public.reserve_store_order_inventory(uuid) to service_role;
grant execute on function public.consume_store_order_inventory(uuid) to service_role;
grant execute on function public.release_store_order_inventory(uuid) to service_role;

commit;
