import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  toPromoDefinition,
  validatePromoCode,
} from "@/lib/promo-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { lookupPromo } from "@/lib/promotions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    code?: string;
    foodTotal?: number;
  };

  if (!body.code?.trim()) {
    return NextResponse.json({ error: "กรุณากรอกโค้ด" }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    const result = await validatePromoCode(body.code, {
      foodTotal: body.foodTotal ?? 0,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      promo: toPromoDefinition(result.promo),
      label: result.promo.label,
      remainingUses:
        result.promo.maxUses === null
          ? null
          : Math.max(0, result.promo.maxUses - result.promo.usedCount),
    });
  }

  const promo = lookupPromo(body.code);
  if (!promo) {
    return NextResponse.json(
      { error: "โค้ดโปรโมชั่นไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  return NextResponse.json({ promo, label: promo.label, remainingUses: null });
}
