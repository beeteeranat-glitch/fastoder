import { RESTAURANT } from "@/data/menu";
import {
  DEFAULT_LOYALTY_SETTINGS,
  type LoyaltySettings,
} from "@/lib/loyalty";
import { createServerClient } from "@/lib/supabase/server";

function mapSettings(row: {
  earn_spend_amount?: number;
  earn_points?: number;
  redemption_points?: number;
} | null): LoyaltySettings {
  if (!row) return DEFAULT_LOYALTY_SETTINGS;
  return {
    earnSpendAmount: row.earn_spend_amount ?? DEFAULT_LOYALTY_SETTINGS.earnSpendAmount,
    earnPoints: row.earn_points ?? DEFAULT_LOYALTY_SETTINGS.earnPoints,
    redemptionPoints: row.redemption_points ?? DEFAULT_LOYALTY_SETTINGS.redemptionPoints,
  };
}

export async function fetchLoyaltySettings(): Promise<LoyaltySettings> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("loyalty_settings")
    .select("earn_spend_amount, earn_points, redemption_points")
    .eq("restaurant_id", RESTAURANT.id)
    .maybeSingle();

  if (error) {
    if (!error.message.includes("loyalty_settings")) {
      console.error("fetch loyalty settings error:", error);
    }
    return DEFAULT_LOYALTY_SETTINGS;
  }

  return mapSettings(data);
}

export async function updateLoyaltySettings(settings: LoyaltySettings) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("loyalty_settings")
    .upsert(
      {
        restaurant_id: RESTAURANT.id,
        earn_spend_amount: settings.earnSpendAmount,
        earn_points: settings.earnPoints,
        redemption_points: settings.redemptionPoints,
      },
      { onConflict: "restaurant_id" },
    )
    .select("earn_spend_amount, earn_points, redemption_points")
    .single();

  if (error) {
    console.error("update loyalty settings error:", error);
    return null;
  }

  return mapSettings(data);
}
