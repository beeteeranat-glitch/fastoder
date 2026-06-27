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

  const [redemptionsRes, transactionsRes] = await Promise.all([
    supabase
      .from("reward_redemptions")
      .select("*, customers(name, phone)")
      .eq("restaurant_id", RESTAURANT.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("point_transactions")
      .select("*, customers(name, phone)")
      .eq("restaurant_id", RESTAURANT.id)
      .eq("type", "redeem")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (redemptionsRes.error) {
    console.error("fetch redemptions error:", redemptionsRes.error);
  }

  return NextResponse.json({
    redemptions: redemptionsRes.data ?? [],
    redeemTransactions: transactionsRes.data ?? [],
  });
}
