create table if not exists public.loyalty_settings (
  restaurant_id text primary key references public.restaurants(id) on delete cascade,
  earn_spend_amount integer not null default 100 check (earn_spend_amount > 0),
  earn_points integer not null default 10 check (earn_points > 0),
  redemption_points integer not null default 100 check (redemption_points > 0),
  updated_at timestamptz not null default now()
);

insert into public.loyalty_settings (restaurant_id)
values ('demo-shop')
on conflict (restaurant_id) do nothing;

alter table public.loyalty_settings enable row level security;

create policy loyalty_settings_public_read on public.loyalty_settings
  for select to anon, authenticated using (true);
