import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ promos: [] });
  }

  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("promo_codes")
    .select("code, label, discount_type, discount_value, min_order_amount")
    .eq("restaurant_id", RESTAURANT.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetch customer promos error:", error);
    return NextResponse.json({ promos: [] });
  }

  const promos = (data ?? []).filter((promo) => {
    // basic active filter — detailed validation at checkout
    return true;
  });

  return NextResponse.json({ promos, fetchedAt: now });
}
