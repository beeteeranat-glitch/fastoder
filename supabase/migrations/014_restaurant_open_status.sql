alter table public.restaurants
  add column if not exists is_open boolean not null default true;

grant select on public.restaurants to anon, authenticated;
