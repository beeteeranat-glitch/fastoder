import {
  formatPhoneInput,
  isValidPhone,
  normalizePhone,
} from "@/lib/phone";

export type PromoDefinition = {
  code: string;
  label: string;
  type: "percent_food" | "fixed_total" | "free_delivery";
  value: number;
};

export const PROMO_CODES: Record<string, PromoDefinition> = {
  SMOOTHIE10: {
    code: "SMOOTHIE10",
    label: "ลด 10% ค่าเครื่องดื่ม",
    type: "percent_food",
    value: 10,
  },
  SAVE20: {
    code: "SAVE20",
    label: "ลด ฿20",
    type: "fixed_total",
    value: 20,
  },
  FREESHIP: {
    code: "FREESHIP",
    label: "จัดส่งฟรี",
    type: "free_delivery",
    value: 0,
  },
};

export function sanitizeReferrerPhoneInput(value: string) {
  return formatPhoneInput(value);
}

export function isValidReferrerPhone(phone: string) {
  return isValidPhone(phone);
}

export function normalizeReferrerPhone(value: string) {
  return normalizePhone(value);
}

export function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function lookupPromo(code: string) {
  const key = normalizeCode(code);
  return PROMO_CODES[key] ?? null;
}

export function calcOrderDiscounts({
  foodTotal,
  deliveryFee,
  promo,
}: {
  foodTotal: number;
  deliveryFee: number | null;
  promo: PromoDefinition | null;
}) {
  if (!promo) {
    return {
      foodDiscount: 0,
      deliveryDiscount: 0,
      totalDiscount: 0,
      label: null as string | null,
    };
  }

  const delivery = deliveryFee ?? 0;
  let foodDiscount = 0;
  let deliveryDiscount = 0;

  if (promo.type === "percent_food") {
    foodDiscount = Math.round((foodTotal * promo.value) / 100);
  } else if (promo.type === "fixed_total") {
    const raw = Math.min(promo.value, foodTotal + delivery);
    foodDiscount = Math.min(raw, foodTotal);
    deliveryDiscount = raw - foodDiscount;
  } else if (promo.type === "free_delivery") {
    deliveryDiscount = delivery;
  }

  return {
    foodDiscount,
    deliveryDiscount,
    totalDiscount: foodDiscount + deliveryDiscount,
    label: promo.label,
  };
}
