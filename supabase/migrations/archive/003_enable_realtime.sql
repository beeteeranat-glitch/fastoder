-- เปิด Realtime สำหรับตารางที่ UI ฟังอยู่ (รันใน Supabase SQL Editor ถ้ายังไม่ได้ migrate)
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.toppings;
alter publication supabase_realtime add table public.addons;
