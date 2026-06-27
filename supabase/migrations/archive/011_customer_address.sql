-- ที่อยู่เริ่มต้นของลูกค้า (ใช้ตอน login / prefill checkout)

alter table public.customers
  add column if not exists default_address text;
