-- โลโก้ร้าน
alter table public.restaurants
  add column if not exists logo_url text;
