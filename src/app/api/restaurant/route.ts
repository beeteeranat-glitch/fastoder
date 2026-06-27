import { NextResponse } from "next/server";
import {
  DEFAULT_SHOP,
  fetchRestaurantFromDb,
} from "@/lib/restaurant-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isSupabaseConfigured()) {
    const shop = await fetchRestaurantFromDb();
    if (shop) {
      return NextResponse.json(shop, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }
  }

  return NextResponse.json(DEFAULT_SHOP);
}
