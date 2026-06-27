-- แก้อัตราคะแนน: 100 บาท = 10 คะแนน (เดิมผิดเป็น 1 บาท = 1 คะแนน)
-- รันครั้งเดียวใน Supabase SQL Editor หลัง deploy โค้ดใหม่

update public.orders
set points_earned = floor(payable_total * 10 / 100)
where status = 'COMPLETED';

update public.customers c
set points = greatest(
  0,
  coalesce((
    select sum(floor(o.payable_total * 10 / 100))
    from public.orders o
    where o.restaurant_id = c.restaurant_id
      and o.customer_phone = c.phone
      and o.status = 'COMPLETED'
  ), 0)
  - coalesce((
    select sum(r.points_used)
    from public.reward_redemptions r
    where r.customer_id = c.id
  ), 0)
);
