import { RESTAURANT } from "@/data/menu";
import {
  DEFAULT_DELIVERY_SETTINGS,
  type DeliverySettings,
} from "@/lib/delivery-fee";
import { createServerClient } from "@/lib/supabase/server";
import type { DbDeliveryFeeTier, DbRestaurant } from "@/types/database";

export type DeliverySettingsResponse = {
  minMeters: number;
  maxMeters: number;
  blockMeters: number;
  tiers: {
    id: string;
    distanceMeters: number;
    feeBaht: number;
    sortOrder: number;
  }[];
};

function mapSettings(
  restaurant: Pick<
    DbRestaurant,
    "delivery_radius_meters" | "delivery_min_meters" | "delivery_block_meters"
  >,
  tiers: DbDeliveryFeeTier[],
): DeliverySettingsResponse {
  const sorted = [...tiers].sort(
    (a, b) => a.sort_order - b.sort_order || a.distance_meters - b.distance_meters,
  );

  return {
    minMeters: restaurant.delivery_min_meters,
    maxMeters: restaurant.delivery_radius_meters,
    blockMeters: restaurant.delivery_block_meters,
    tiers: sorted.map((tier) => ({
      id: tier.id,
      distanceMeters: tier.distance_meters,
      feeBaht: tier.fee_baht,
      sortOrder: tier.sort_order,
    })),
  };
}

export async function seedDeliverySettingsIfEmpty() {
  const supabase = createServerClient();
  const { count } = await supabase
    .from("delivery_fee_tiers")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", RESTAURANT.id);

  if ((count ?? 0) > 0) return false;

  await supabase
    .from("restaurants")
    .update({
      delivery_radius_meters: DEFAULT_DELIVERY_SETTINGS.maxMeters,
      delivery_min_meters: DEFAULT_DELIVERY_SETTINGS.minMeters,
      delivery_block_meters: DEFAULT_DELIVERY_SETTINGS.blockMeters,
    })
    .eq("id", RESTAURANT.id);

  await supabase.from("delivery_fee_tiers").insert(
    DEFAULT_DELIVERY_SETTINGS.tiers.map((tier, index) => ({
      restaurant_id: RESTAURANT.id,
      distance_meters: tier.distanceMeters,
      fee_baht: tier.feeBaht,
      sort_order: index + 1,
    })),
  );

  return true;
}

export async function fetchDeliverySettingsFromDb(): Promise<DeliverySettingsResponse | null> {
  await seedDeliverySettingsIfEmpty();
  const supabase = createServerClient();

  const [restaurantRes, tiersRes] = await Promise.all([
    supabase
      .from("restaurants")
      .select(
        "delivery_radius_meters, delivery_min_meters, delivery_block_meters",
      )
      .eq("id", RESTAURANT.id)
      .single(),
    supabase
      .from("delivery_fee_tiers")
      .select("*")
      .eq("restaurant_id", RESTAURANT.id)
      .order("sort_order"),
  ]);

  if (restaurantRes.error || tiersRes.error || !restaurantRes.data) {
    console.error("fetchDeliverySettings errors:", {
      restaurant: restaurantRes.error,
      tiers: tiersRes.error,
    });
    return null;
  }

  if (!tiersRes.data?.length) return null;

  return mapSettings(
    {
      delivery_radius_meters: restaurantRes.data.delivery_radius_meters,
      delivery_min_meters: restaurantRes.data.delivery_min_meters ?? 500,
      delivery_block_meters: restaurantRes.data.delivery_block_meters ?? 500,
    },
    tiersRes.data,
  );
}

export function toDeliverySettings(
  response: DeliverySettingsResponse,
): DeliverySettings {
  return {
    minMeters: response.minMeters,
    maxMeters: response.maxMeters,
    blockMeters: response.blockMeters,
    tiers: response.tiers.map((tier) => ({
      distanceMeters: tier.distanceMeters,
      feeBaht: tier.feeBaht,
    })),
  };
}
