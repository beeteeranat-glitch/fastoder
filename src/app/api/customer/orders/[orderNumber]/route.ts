import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type RouteParams = { params: Promise<{ orderNumber: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const { orderNumber } = await params;
  const supabase = createServerClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", RESTAURANT.id)
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, address, latitude, longitude, delivery_radius_meters")
    .eq("id", RESTAURANT.id)
    .maybeSingle();

  return NextResponse.json({
    order,
    items: items ?? [],
    restaurant,
  });
}
