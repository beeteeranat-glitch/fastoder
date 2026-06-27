-- ข้อมูลบัญชีรับโอนและ QR ชำระเงิน
alter table public.restaurants
  add column if not exists bank_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_account_name text,
  add column if not exists payment_qr_url text;

update public.restaurants
set
  bank_name = coalesce(bank_name, 'กสิกรไทย'),
  bank_account_number = coalesce(bank_account_number, '123-4-56789-0'),
  bank_account_name = coalesce(bank_account_name, name),
  payment_qr_url = coalesce(payment_qr_url, '/payment-qr-example.svg')
where id = 'demo-shop';

notify pgrst, 'reload schema';
