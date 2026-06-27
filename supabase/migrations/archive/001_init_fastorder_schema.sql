-- FastOrder initial schema

create type public.order_status as enum (
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_DELIVERY',
  'DELIVERING',
  'COMPLETED',
  'CANCELLED'
);

create table public.restaurants (
  id text primary key,
  name text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  delivery_radius_meters integer not null default 10000,
  created_at timestamptz not null default now()
);

create table public.categories (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  emoji text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  category_id text not null references public.categories(id) on delete cascade,
  name text not null,
  description text,
  base_price integer not null check (base_price >= 0),
  emoji text,
  gradient text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  restaurant_id text not null references public.restaurants(id),
  customer_name text not null,
  customer_phone text not null,
  customer_note text,
  delivery_address text not null,
  delivery_latitude double precision,
  delivery_longitude double precision,
  distance_meters integer,
  food_total integer not null check (food_total >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  discount_total integer not null default 0 check (discount_total >= 0),
  payable_total integer not null check (payable_total >= 0),
  payment_method text not null check (payment_method in ('cash', 'transfer')),
  promo_code text,
  referrer_code text,
  status public.order_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  options jsonb not null default '{}'::jsonb,
  toppings jsonb not null default '[]'::jsonb,
  addons jsonb not null default '[]'::jsonb,
  line_total integer not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index orders_status_created_at_idx on public.orders (status, created_at desc);
create index orders_customer_phone_idx on public.orders (customer_phone);
create index order_items_order_id_idx on public.order_items (order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

insert into public.restaurants (id, name, address, latitude, longitude, delivery_radius_meters)
values (
  'demo-shop',
  'สมูทตี้สดใส',
  '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
  13.7563,
  100.5018,
  10000
)
on conflict (id) do nothing;

alter table public.restaurants enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy restaurants_public_read on public.restaurants
  for select to anon, authenticated using (true);

create policy categories_public_read on public.categories
  for select to anon, authenticated using (true);

create policy products_public_read on public.products
  for select to anon, authenticated using (true);

create policy orders_public_read on public.orders
  for select to anon, authenticated using (true);

create policy order_items_public_read on public.order_items
  for select to anon, authenticated using (true);
