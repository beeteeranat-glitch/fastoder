import { RESTAURANT } from "@/data/menu";
import { earnPointsOnOrderComplete } from "@/lib/points-data";
import { createServerClient } from "@/lib/supabase/server";
import type { DbCustomer, DbOrderStatus } from "@/types/database";

export async function fetchCustomerByPhone(phone: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("restaurant_id", RESTAURANT.id)
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    console.error("fetch customer by phone error:", error);
    return null;
  }

  return data as DbCustomer | null;
}

export async function upsertCustomerOnOrder({
  phone,
  name,
  createdAt,
}: {
  phone: string;
  name: string;
  createdAt: string;
}) {
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("customers")
    .select("id, order_count")
    .eq("restaurant_id", RESTAURANT.id)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("customers")
      .update({
        name,
        order_count: existing.order_count + 1,
        last_order_at: createdAt,
      })
      .eq("id", existing.id);

    if (error) console.error("update customer on order error:", error);
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      restaurant_id: RESTAURANT.id,
      phone,
      name,
      order_count: 1,
      first_order_at: createdAt,
      last_order_at: createdAt,
    })
    .select("id")
    .single();

  if (error) {
    console.error("insert customer on order error:", error);
    return null;
  }

  return data.id as string;
}

export async function adjustCustomerOnOrderStatusChange({
  phone,
  previousStatus,
  nextStatus,
  payableTotal,
  orderId,
}: {
  phone: string;
  previousStatus: DbOrderStatus;
  nextStatus: DbOrderStatus;
  payableTotal: number;
  orderId?: string;
}) {
  const customer = await fetchCustomerByPhone(phone);
  if (!customer) return;

  const supabase = createServerClient();

  if (nextStatus === "CANCELLED" && previousStatus !== "CANCELLED") {
    const nextCount = Math.max(0, customer.order_count - 1);
    const updates: Partial<DbCustomer> = { order_count: nextCount };

    if (previousStatus === "COMPLETED") {
      updates.total_spent = Math.max(0, customer.total_spent - payableTotal);
    }

    const { error } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", customer.id);

    if (error) console.error("adjust customer on cancel error:", error);
    return;
  }

  if (
    nextStatus === "COMPLETED" &&
    previousStatus !== "COMPLETED" &&
    orderId
  ) {
    const { error } = await supabase
      .from("customers")
      .update({
        total_spent: customer.total_spent + payableTotal,
      })
      .eq("id", customer.id);

    if (error) {
      console.error("adjust customer total_spent error:", error);
      return;
    }

    await earnPointsOnOrderComplete({
      customerId: customer.id,
      orderId,
      payableTotal,
    });
  }
}
