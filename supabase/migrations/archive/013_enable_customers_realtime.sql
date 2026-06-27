-- เปิด Realtime สำหรับคะแนน/โปรไฟล์ลูกค้า (หน้า /profile, /rewards)
alter publication supabase_realtime add table public.customers;
