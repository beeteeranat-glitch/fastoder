alter table public.restaurants
  add column if not exists closing_until timestamptz null;

grant select on public.restaurants to anon, authenticated;
