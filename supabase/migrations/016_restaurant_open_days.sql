alter table public.restaurants
  add column if not exists open_days smallint[] not null default array[0, 1, 2, 3, 4, 5, 6]::smallint[];

update public.restaurants
set open_days = array[0, 1, 2, 3, 4, 5, 6]::smallint[]
where open_days is null or array_length(open_days, 1) is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurants_open_days_valid'
  ) then
    alter table public.restaurants
      add constraint restaurants_open_days_valid
      check (
        open_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
        and array_length(open_days, 1) is not null
      );
  end if;
end $$;

grant select on public.restaurants to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'restaurants'
  ) then
    alter publication supabase_realtime add table public.restaurants;
  end if;
end $$;
