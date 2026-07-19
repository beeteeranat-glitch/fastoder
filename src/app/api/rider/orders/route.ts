import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
import { isRiderAuthenticated } from "@/lib/rider-session";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { withSignedOrderMedia } from "@/lib/private-order-files";
import type { DbOrderStatus } from "@/types/database";

const RIDER_STATUSES: DbOrderStatus[] = ["READY_FOR_DELIVERY", "DELIVERING"];

const RIDER_ORDER_SELECT =
  "id, order_number, customer_name, customer_phone, delivery_address, delivery_latitude, delivery_longitude, distance_meters, payable_total, payment_method, customer_note, delivery_proof_url, status, created_at";

export async function GET() {
  if (!(await isRiderAuthenticated())) {
    return NextResponse.json({ error: "กรุณาเข้าสู่หน้าสำหรับไรเดอร์" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  }

  const { data, error } = await createServerClient()
    .from("orders")
    .select(RIDER_ORDER_SELECT)
    .eq("restaurant_id", RESTAURANT.id)
    .eq("order_type", "delivery")
    .in("status", RIDER_STATUSES)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("list rider orders error:", error);
    return NextResponse.json({ error: "โหลดงานจัดส่งไม่สำเร็จ" }, { status: 500 });
  }

  const orders = await Promise.all((data ?? []).map(withSignedOrderMedia));
  return NextResponse.json({
    orders,
    readyCount: orders.filter((order) => order.status === "READY_FOR_DELIVERY").length,
    deliveringCount: orders.filter((order) => order.status === "DELIVERING").length,
  });
}
