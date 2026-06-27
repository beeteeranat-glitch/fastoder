-- คะแนนสะสม, แลกรางวัล, OTP login

alter table public.customers
  add column if not exists points integer not null default 0 check (points >= 0);

create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  points integer not null,
  type text not null check (type in ('earn', 'redeem')),
  description text,
  created_at timestamptz not null default now()
);

create index if not exists point_transactions_customer_idx
  on public.point_transactions (customer_id, created_at desc);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  points_used integer not null check (points_used > 0),
  reward_type text not null default 'free_drink',
  created_at timestamptz not null default now()
);

create table if not exists public.customer_otp_codes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_otp_phone_idx
  on public.customer_otp_codes (restaurant_id, phone, expires_at desc);

alter table public.orders
  add column if not exists points_earned integer not null default 0 check (points_earned >= 0);

alter table public.orders
  add column if not exists points_redeemed integer not null default 0 check (points_redeemed >= 0);

alter table public.orders
  add column if not exists reward_discount integer not null default 0 check (reward_discount >= 0);

alter table public.orders
  add column if not exists reward_redemption_id uuid references public.reward_redemptions(id) on delete set null;

alter table public.products
  add column if not exists is_recommended boolean not null default false;

alter table public.products
  add column if not exists is_new boolean not null default false;

alter table public.point_transactions enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.customer_otp_codes enable row level security;

create policy point_transactions_public_read on public.point_transactions
  for select to anon, authenticated using (true);

create policy reward_redemptions_public_read on public.reward_redemptions
  for select to anon, authenticated using (true);
