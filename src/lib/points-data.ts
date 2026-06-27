import { RESTAURANT } from "@/data/menu";
import { createServerClient } from "@/lib/supabase/server";
import type { DbPointTransaction } from "@/types/database";

/** 1 บาท = 1 คะแนน */
export const FREE_DRINK_POINTS = 100;

export function calcEarnedPoints(payableTotal: number) {
  return Math.max(0, Math.floor(payableTotal));
}

export function calcFreeDrinkDiscount(basePrice: number, quantity: number) {
  return Math.max(0, basePrice * quantity);
}

export async function earnPointsOnOrderComplete({
  customerId,
  orderId,
  payableTotal,
}: {
  customerId: string;
  orderId: string;
  payableTotal: number;
}) {
  const points = calcEarnedPoints(payableTotal);
  if (points <= 0) return;

  const supabase = createServerClient();

  const { data: order } = await supabase
    .from("orders")
    .select("points_earned")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.points_earned > 0) return;

  const { data: customer } = await supabase
    .from("customers")
    .select("points")
    .eq("id", customerId)
    .single();

  if (!customer) return;

  const { error: txError } = await supabase.from("point_transactions").insert({
    restaurant_id: RESTAURANT.id,
    customer_id: customerId,
    order_id: orderId,
    points,
    type: "earn",
    description: `ได้รับคะแนนจากออเดอร์`,
  });

  if (txError) {
    console.error("earn points transaction error:", txError);
    return;
  }

  const { error: customerError } = await supabase
    .from("customers")
    .update({ points: customer.points + points })
    .eq("id", customerId);

  if (customerError) {
    console.error("update customer points error:", customerError);
    return;
  }

  await supabase
    .from("orders")
    .update({ points_earned: points })
    .eq("id", orderId);
}

export async function redeemFreeDrinkOnOrder({
  customerId,
  orderId,
  pointsUsed = FREE_DRINK_POINTS,
}: {
  customerId: string;
  orderId: string;
  pointsUsed?: number;
}) {
  const supabase = createServerClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("points")
    .eq("id", customerId)
    .single();

  if (!customer || customer.points < pointsUsed) {
    throw new Error("คะแนนไม่เพียงพอ");
  }

  const { data: redemption, error: redemptionError } = await supabase
    .from("reward_redemptions")
    .insert({
      restaurant_id: RESTAURANT.id,
      customer_id: customerId,
      order_id: orderId,
      points_used: pointsUsed,
      reward_type: "free_drink",
    })
    .select("id")
    .single();

  if (redemptionError || !redemption) {
    console.error("reward redemption error:", redemptionError);
    throw new Error("แลกรางวัลไม่สำเร็จ");
  }

  const { error: txError } = await supabase.from("point_transactions").insert({
    restaurant_id: RESTAURANT.id,
    customer_id: customerId,
    order_id: orderId,
    points: -pointsUsed,
    type: "redeem",
    description: "แลกเครื่องดื่มฟรี 1 แก้ว",
  });

  if (txError) {
    console.error("redeem points transaction error:", txError);
    throw new Error("หักคะแนนไม่สำเร็จ");
  }

  const { error: customerError } = await supabase
    .from("customers")
    .update({ points: customer.points - pointsUsed })
    .eq("id", customerId);

  if (customerError) {
    console.error("deduct customer points error:", customerError);
    throw new Error("หักคะแนนไม่สำเร็จ");
  }

  await supabase
    .from("orders")
    .update({
      points_redeemed: pointsUsed,
      reward_redemption_id: redemption.id,
    })
    .eq("id", orderId);

  return redemption.id as string;
}

export async function fetchPointTransactions(customerId: string, limit = 50) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("point_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("fetch point transactions error:", error);
    return [];
  }

  return (data ?? []) as DbPointTransaction[];
}

export async function fetchRewardRedemptions(customerId: string, limit = 50) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("reward_redemptions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("fetch reward redemptions error:", error);
    return [];
  }

  return data ?? [];
}
