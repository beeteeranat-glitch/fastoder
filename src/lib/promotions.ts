export type PromoDefinition = {
  code: string;
  label: string;
  type: "percent_food" | "fixed_total" | "free_delivery";
  value: number;
};

export type ReferrerDefinition = {
  code: string;
  name: string;
  rewardAmount: number;
};

export const PROMO_CODES: Record<string, PromoDefinition> = {
  SMOOTHIE10: {
    code: "SMOOTHIE10",
    label: "ลด 10% ค่าอาหาร",
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
    label: "ส่งฟรี",
    type: "free_delivery",
    value: 0,
  },
};

export const REFERRERS: Record<string, ReferrerDefinition> = {
  "REF-AOM": {
    code: "REF-AOM",
    name: "อ้อม",
    rewardAmount: 20,
  },
  "REF-BEW": {
    code: "REF-BEW",
    name: "บิว",
    rewardAmount: 20,
  },
  "0812345678": {
    code: "0812345678",
    name: "สมชาย",
    rewardAmount: 15,
  },
};

export function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeReferrerCode(value: string) {
  const trimmed = value.trim();
  if (/^0\d{8,9}$/.test(trimmed.replace(/\D/g, ""))) {
    return trimmed.replace(/\D/g, "");
  }
  return normalizeCode(trimmed);
}

export function lookupPromo(code: string) {
  const key = normalizeCode(code);
  return PROMO_CODES[key] ?? null;
}

export function lookupReferrer(code: string) {
  const phone = code.trim().replace(/\D/g, "");
  if (/^0\d{8,9}$/.test(phone)) {
    return REFERRERS[phone] ?? null;
  }
  const key = normalizeCode(code);
  return REFERRERS[key] ?? null;
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
