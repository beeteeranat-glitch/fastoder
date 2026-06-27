import { NextResponse } from "next/server";
import {
  fetchDeliverySettingsFromDb,
  toDeliverySettings,
} from "@/lib/delivery-settings-data";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery-fee";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isSupabaseConfigured()) {
    const settings = await fetchDeliverySettingsFromDb();
    if (settings) {
      return NextResponse.json({
        ...toDeliverySettings(settings),
        tiers: settings.tiers,
      });
    }
  }

  return NextResponse.json({
    ...DEFAULT_DELIVERY_SETTINGS,
    tiers: DEFAULT_DELIVERY_SETTINGS.tiers.map((tier, index) => ({
      id: `static-${index}`,
      ...tier,
      sortOrder: index + 1,
    })),
  });
}
