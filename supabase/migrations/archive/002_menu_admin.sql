-- Menu admin: images + toppings/addons tables

alter table public.categories
  add column if not exists image_url text;

alter table public.products
  add column if not exists image_url text;

create table if not exists public.toppings (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  name text not null,
  price integer not null check (price >= 0),
  image_url text,
  sort_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.addons (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  name text not null,
  price integer not null check (price >= 0),
  image_url text,
  sort_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists toppings_restaurant_id_idx on public.toppings (restaurant_id);
create index if not exists addons_restaurant_id_idx on public.addons (restaurant_id);

alter table public.toppings enable row level security;
alter table public.addons enable row level security;

create policy toppings_public_read on public.toppings
  for select to anon, authenticated using (true);

create policy addons_public_read on public.addons
  for select to anon, authenticated using (true);
