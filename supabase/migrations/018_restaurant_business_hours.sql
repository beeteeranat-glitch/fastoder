alter table public.restaurants
  add column if not exists opening_time time not null default time '09:00',
  add column if not exists closing_time time not null default time '18:00';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurants_business_hours_valid'
  ) then
    alter table public.restaurants
      add constraint restaurants_business_hours_valid
      check (opening_time < closing_time);
  end if;
end $$;

grant select on public.restaurants to anon, authenticated;
