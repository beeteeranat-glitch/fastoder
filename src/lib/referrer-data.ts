import { RESTAURANT } from "@/data/menu";
import { formatPhoneForDisplay } from "@/lib/phone";
import {
  isValidReferrerPhone,
  normalizeReferrerPhone,
} from "@/lib/promotions";
import { createServerClient } from "@/lib/supabase/server";
import type { DbReferrer } from "@/types/database";

export type ReferrerDefinition = {
  code: string;
  name: string;
  rewardAmount: number;
};

const DEFAULT_REFERRER_REWARD = 20;

function toReferrerDefinition(row: DbReferrer): ReferrerDefinition {
  return {
    code: row.phone,
    name: row.name,
    rewardAmount: row.reward_amount,
  };
}

export async function fetchActiveReferrerByPhone(phone: string) {
  const normalized = normalizeReferrerPhone(phone);
  if (!isValidReferrerPhone(normalized)) return null;

  const supabase = createServerClient();

  const { data: referrer, error } = await supabase
    .from("referrers")
    .select("*")
    .eq("restaurant_id", RESTAURANT.id)
    .eq("phone", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("fetch referrer by phone error:", error);
    return null;
  }
  if (referrer) return toReferrerDefinition(referrer);

  const { data: customer } = await supabase
    .from("customers")
    .select("name")
    .eq("restaurant_id", RESTAURANT.id)
    .eq("phone", normalized)
    .maybeSingle();

  if (customer) {
    return {
      code: normalized,
      name: customer.name,
      rewardAmount: DEFAULT_REFERRER_REWARD,
    };
  }

  const { data: pastReferral } = await supabase
    .from("orders")
    .select("id")
    .eq("restaurant_id", RESTAURANT.id)
    .eq("referrer_code", normalized)
    .limit(1)
    .maybeSingle();

  if (pastReferral) {
    return {
      code: normalized,
      name: formatPhoneForDisplay(normalized),
      rewardAmount: DEFAULT_REFERRER_REWARD,
    };
  }

  return null;
}

export async function fetchReferrerNameByPhone(phone: string) {
  const referrer = await fetchActiveReferrerByPhone(phone);
  if (referrer) return referrer.name;

  const normalized = normalizeReferrerPhone(phone);
  return isValidReferrerPhone(normalized)
    ? formatPhoneForDisplay(normalized)
    : phone;
}
