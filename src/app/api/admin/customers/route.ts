import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("restaurant_id", RESTAURANT.id)
    .order("last_order_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    console.error("fetch customers error:", error);
    return NextResponse.json({ error: "โหลดไม่สำเร็จ" }, { status: 500 });
  }

  const repeatCustomers = (data ?? []).filter((c) => c.order_count >= 2);

  return NextResponse.json({
    customers: data ?? [],
    repeatCustomers,
    stats: {
      totalCustomers: data?.length ?? 0,
      repeatCustomers: repeatCustomers.length,
    },
  });
}
