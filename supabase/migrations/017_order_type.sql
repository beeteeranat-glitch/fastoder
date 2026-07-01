alter table public.orders
  add column if not exists order_type text not null default 'delivery'
  check (order_type in ('delivery', 'pickup'));

create index if not exists orders_restaurant_order_type_idx
  on public.orders (restaurant_id, order_type);
