-- ตั้งค่าจัดส่ง + โค้ดโปรโมชั่น

alter table public.restaurants
  add column if not exists delivery_min_meters integer not null default 500,
  add column if not exists delivery_block_meters integer not null default 500;

update public.restaurants
set
  delivery_radius_meters = 2000,
  delivery_min_meters = 500,
  delivery_block_meters = 500
where id = 'demo-shop';

create table if not exists public.delivery_fee_tiers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  distance_meters integer not null check (distance_meters > 0),
  fee_baht integer not null check (fee_baht >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (restaurant_id, distance_meters)
);

create index if not exists delivery_fee_tiers_restaurant_id_idx
  on public.delivery_fee_tiers (restaurant_id, sort_order);

create type public.promo_discount_type as enum (
  'percent_food',
  'fixed_total',
  'free_delivery'
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  code text not null,
  label text not null,
  discount_type public.promo_discount_type not null default 'percent_food',
  discount_value integer not null default 0 check (discount_value >= 0),
  min_order_amount integer not null default 0 check (min_order_amount >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, code)
);

create index if not exists promo_codes_restaurant_id_idx
  on public.promo_codes (restaurant_id, is_active);

create trigger promo_codes_set_updated_at
before update on public.promo_codes
for each row execute function public.set_updated_at();

alter table public.delivery_fee_tiers enable row level security;
alter table public.promo_codes enable row level security;

create policy delivery_fee_tiers_public_read on public.delivery_fee_tiers
  for select to anon, authenticated using (true);

create policy promo_codes_public_read on public.promo_codes
  for select to anon, authenticated using (true);

insert into public.delivery_fee_tiers (restaurant_id, distance_meters, fee_baht, sort_order)
values
  ('demo-shop', 500, 5, 1),
  ('demo-shop', 1000, 8, 2),
  ('demo-shop', 1500, 10, 3),
  ('demo-shop', 2000, 12, 4)
on conflict (restaurant_id, distance_meters) do nothing;

insert into public.promo_codes (
  restaurant_id, code, label, discount_type, discount_value, is_active
)
values
  ('demo-shop', 'SMOOTHIE10', 'ลด 10% ค่าอาหาร', 'percent_food', 10, true),
  ('demo-shop', 'SAVE20', 'ลด ฿20', 'fixed_total', 20, true),
  ('demo-shop', 'FREESHIP', 'ส่งฟรี', 'free_delivery', 0, true)
on conflict (restaurant_id, code) do nothing;
