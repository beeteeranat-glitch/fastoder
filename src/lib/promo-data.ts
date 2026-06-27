import { RESTAURANT } from "@/data/menu";
import {
  calcOrderDiscounts,
  normalizeCode,
  type PromoDefinition,
} from "@/lib/promotions";
import { createServerClient } from "@/lib/supabase/server";
import type { DbPromoCode, PromoDiscountType } from "@/types/database";

export const PROMO_DISCOUNT_TYPE_OPTIONS: {
  value: PromoDiscountType;
  label: string;
}[] = [
  { value: "percent_food", label: "ลด % ค่าเครื่องดื่ม" },
  { value: "fixed_total", label: "ลดยอดรวม (บาท)" },
  { value: "free_delivery", label: "จัดส่งฟรี" },
];

export function getPromoDiscountTypeLabel(type: PromoDiscountType) {
  return (
    PROMO_DISCOUNT_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    type
  );
}

export type PromoCodeRecord = {
  id: string;
  code: string;
  label: string;
  discountType: PromoDiscountType;
  discountValue: number;
  minOrderAmount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PromoStatus =
  | "active"
  | "scheduled"
  | "expired"
  | "sold_out"
  | "inactive";

const STATIC_PROMOS: Omit<
  DbPromoCode,
  "id" | "restaurant_id" | "created_at" | "updated_at" | "used_count"
>[] = [
  {
    code: "SMOOTHIE10",
    label: "ลด 10% ค่าเครื่องดื่ม",
    discount_type: "percent_food",
    discount_value: 10,
    min_order_amount: 0,
    starts_at: null,
    ends_at: null,
    is_active: true,
    max_uses: null,
  },
  {
    code: "SAVE20",
    label: "ลด ฿20",
    discount_type: "fixed_total",
    discount_value: 20,
    min_order_amount: 0,
    starts_at: null,
    ends_at: null,
    is_active: true,
    max_uses: null,
  },
  {
    code: "FREESHIP",
    label: "จัดส่งฟรี",
    discount_type: "free_delivery",
    discount_value: 0,
    min_order_amount: 0,
    starts_at: null,
    ends_at: null,
    is_active: true,
    max_uses: null,
  },
];

export function mapPromoCode(row: DbPromoCode): PromoCodeRecord {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minOrderAmount: row.min_order_amount,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPromoDefinition(promo: PromoCodeRecord): PromoDefinition {
  return {
    code: promo.code,
    label: promo.label,
    type: promo.discountType,
    value: promo.discountValue,
  };
}

export function getPromoStatus(
  promo: PromoCodeRecord,
  now = new Date(),
): PromoStatus {
  if (!promo.isActive) return "inactive";
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return "sold_out";
  }
  if (promo.startsAt && new Date(promo.startsAt) > now) return "scheduled";
  if (promo.endsAt && new Date(promo.endsAt) < now) return "expired";
  return "active";
}

export function getPromoStatusLabel(status: PromoStatus) {
  switch (status) {
    case "active":
      return "ใช้งานได้";
    case "scheduled":
      return "รอเริ่ม";
    case "expired":
      return "หมดเวลา";
    case "sold_out":
      return "ตั๋วหมด";
    case "inactive":
      return "ปิดใช้งาน";
  }
}

export function formatPromoDiscount(promo: PromoCodeRecord) {
  switch (promo.discountType) {
    case "percent_food":
      return `ลด ${promo.discountValue}%`;
    case "fixed_total":
      return `ลด ฿${promo.discountValue}`;
    case "free_delivery":
      return "จัดส่งฟรี";
  }
}

export async function seedPromoCodesIfEmpty() {
  const supabase = createServerClient();
  const { count } = await supabase
    .from("promo_codes")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", RESTAURANT.id);

  if ((count ?? 0) > 0) return false;

  await supabase.from("promo_codes").insert(
    STATIC_PROMOS.map((promo) => ({
      restaurant_id: RESTAURANT.id,
      ...promo,
    })),
  );

  return true;
}

export async function fetchPromoCodesFromDb(): Promise<PromoCodeRecord[]> {
  await seedPromoCodesIfEmpty();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("restaurant_id", RESTAURANT.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("fetchPromoCodes error:", error);
    return [];
  }

  return data.map(mapPromoCode);
}

export async function fetchPromoByCode(
  code: string,
): Promise<PromoCodeRecord | null> {
  await seedPromoCodesIfEmpty();
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("restaurant_id", RESTAURANT.id)
    .eq("code", normalized)
    .maybeSingle();

  if (error || !data) return null;
  return mapPromoCode(data);
}

export type PromoValidationResult =
  | { ok: true; promo: PromoCodeRecord; definition: PromoDefinition }
  | { ok: false; error: string };

export function validatePromoRecord(
  promo: PromoCodeRecord,
  options: { foodTotal?: number } = {},
): PromoValidationResult {
  const status = getPromoStatus(promo);
  if (status === "inactive") {
    return { ok: false, error: "โค้ดนี้ปิดใช้งานแล้ว" };
  }
  if (status === "scheduled") {
    return { ok: false, error: "โปรโมชั่นยังไม่เริ่ม" };
  }
  if (status === "expired") {
    return { ok: false, error: "โปรโมชั่นหมดอายุแล้ว" };
  }
  if (status === "sold_out") {
    return { ok: false, error: "โค้ดนี้ถูกใช้ครบจำนวนแล้ว" };
  }

  const foodTotal = options.foodTotal ?? 0;
  if (promo.minOrderAmount > 0 && foodTotal < promo.minOrderAmount) {
    return {
      ok: false,
      error: `ยอดเมนูขั้นต่ำ ฿${promo.minOrderAmount}`,
    };
  }

  return { ok: true, promo, definition: toPromoDefinition(promo) };
}

export async function validatePromoCode(
  code: string,
  options: { foodTotal?: number } = {},
): Promise<PromoValidationResult> {
  const promo = await fetchPromoByCode(code);
  if (!promo) {
    return { ok: false, error: "โค้ดโปรโมชั่นไม่ถูกต้อง" };
  }
  return validatePromoRecord(promo, options);
}

export async function incrementPromoUsage(promoId: string) {
  const supabase = createServerClient();
  const { data: current } = await supabase
    .from("promo_codes")
    .select("used_count, max_uses")
    .eq("id", promoId)
    .single();

  if (!current) return false;
  if (
    current.max_uses !== null &&
    current.used_count >= current.max_uses
  ) {
    return false;
  }

  const { error } = await supabase
    .from("promo_codes")
    .update({ used_count: current.used_count + 1 })
    .eq("id", promoId);

  return !error;
}

export function calcDiscountForPromo(
  promo: PromoDefinition,
  foodTotal: number,
  deliveryFee: number | null,
) {
  return calcOrderDiscounts({ foodTotal, deliveryFee, promo });
}
