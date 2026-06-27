-- สลิปโอนเงิน
alter table public.orders
  add column if not exists payment_slip_url text;

-- ให้ PostgREST โหลด schema ใหม่ทันทีหลังเพิ่มคอลัมน์
notify pgrst, 'reload schema';
