-- รูปหลักฐานที่ไรเดอร์ถ่ายก่อนปิดงานจัดส่ง
alter table public.orders
  add column if not exists delivery_proof_url text;

notify pgrst, 'reload schema';
