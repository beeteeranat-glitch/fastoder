-- ผู้แนะนำ (จัดการผ่าน Admin) + ลูกค้า

create table if not exists public.referrers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  phone text not null,
  name text not null,
  reward_amount integer not null default 20 check (reward_amount >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, phone)
);

create index if not exists referrers_restaurant_id_idx
  on public.referrers (restaurant_id, is_active);

create trigger referrers_set_updated_at
before update on public.referrers
for each row execute function public.set_updated_at();

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  phone text not null,
  name text not null,
  notes text,
  order_count integer not null default 0 check (order_count >= 0),
  total_spent integer not null default 0 check (total_spent >= 0),
  first_order_at timestamptz,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, phone)
);

create index if not exists customers_restaurant_id_idx
  on public.customers (restaurant_id, last_order_at desc nulls last);

create index if not exists customers_phone_idx
  on public.customers (restaurant_id, phone);

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

alter table public.referrers enable row level security;
alter table public.customers enable row level security;

create policy referrers_public_read on public.referrers
  for select to anon, authenticated using (true);

create policy customers_public_read on public.customers
  for select to anon, authenticated using (true);

-- seed ผู้แนะนำจากข้อมูลเดิม
insert into public.referrers (restaurant_id, phone, name, reward_amount, is_active)
values
  ('demo-shop', '0811111111', 'อ้อม', 20, true),
  ('demo-shop', '0822222222', 'บิว', 20, true),
  ('demo-shop', '0812345678', 'สมชาย', 15, true)
on conflict (restaurant_id, phone) do nothing;

-- backfill ลูกค้าจากออเดอร์เดิม
insert into public.customers (
  restaurant_id,
  phone,
  name,
  order_count,
  total_spent,
  first_order_at,
  last_order_at
)
select
  o.restaurant_id,
  o.customer_phone,
  (
    select o2.customer_name
    from public.orders o2
    where o2.restaurant_id = o.restaurant_id
      and o2.customer_phone = o.customer_phone
    order by o2.created_at desc
    limit 1
  ) as name,
  count(*) filter (where o.status <> 'CANCELLED')::integer as order_count,
  coalesce(sum(o.payable_total) filter (where o.status = 'COMPLETED'), 0)::integer as total_spent,
  min(o.created_at) as first_order_at,
  max(o.created_at) as last_order_at
from public.orders o
group by o.restaurant_id, o.customer_phone
on conflict (restaurant_id, phone) do nothing;
