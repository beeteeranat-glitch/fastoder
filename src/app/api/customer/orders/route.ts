import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
import { getAuthenticatedCustomer } from "@/lib/customer-session";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { DbOrder } from "@/types/database";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, payable_total, food_total, delivery_fee, discount_total, reward_discount, points_earned, points_redeemed, created_at, updated_at",
    )
    .eq("restaurant_id", RESTAURANT.id)
    .eq("customer_phone", customer.phone)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("fetch customer orders error:", error);
    return NextResponse.json({ error: "โหลดไม่สำเร็จ" }, { status: 500 });
  }

  return NextResponse.json({ orders: (data ?? []) as DbOrder[] });
}
