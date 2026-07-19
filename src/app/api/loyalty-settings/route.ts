import { NextResponse } from "next/server";
import { DEFAULT_LOYALTY_SETTINGS } from "@/lib/loyalty";
import { fetchLoyaltySettings } from "@/lib/loyalty-settings-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(DEFAULT_LOYALTY_SETTINGS);
  }

  return NextResponse.json(await fetchLoyaltySettings(), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
