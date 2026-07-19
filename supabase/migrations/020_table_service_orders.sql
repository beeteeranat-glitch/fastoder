alter table public.orders
  add column if not exists table_number text null;

do $$
declare
  order_type_constraint text;
begin
  select c.conname
  into order_type_constraint
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'orders'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%order_type%'
  limit 1;

  if order_type_constraint is not null then
    execute format('alter table public.orders drop constraint %I', order_type_constraint);
  end if;
end $$;

alter table public.orders
  add constraint orders_order_type_valid
  check (order_type in ('delivery', 'pickup', 'table_service'));
