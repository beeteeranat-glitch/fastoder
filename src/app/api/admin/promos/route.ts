import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
import { fetchPromoCodesFromDb, mapPromoCode } from "@/lib/promo-data";
import { normalizeCode } from "@/lib/promotions";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { PromoDiscountType } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const promos = await fetchPromoCodesFromDb();
  return NextResponse.json({ promos });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    code?: string;
    label?: string;
    discount_type?: PromoDiscountType;
    discount_value?: number;
    min_order_amount?: number;
    starts_at?: string | null;
    ends_at?: string | null;
    is_active?: boolean;
    max_uses?: number | null;
  };

  const code = normalizeCode(body.code ?? "");
  if (!code || !body.label?.trim()) {
    return NextResponse.json(
      { error: "กรอกโค้ดและชื่อโปรโมชั่น" },
      { status: 400 },
    );
  }

  const discountType = body.discount_type ?? "percent_food";
  const discountValue =
    discountType === "free_delivery" ? 0 : (body.discount_value ?? 0);

  if (discountType === "percent_food" && (discountValue < 1 || discountValue > 100)) {
    return NextResponse.json(
      { error: "เปอร์เซ็นต์ลดต้องอยู่ระหว่าง 1–100" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      restaurant_id: RESTAURANT.id,
      code,
      label: body.label.trim(),
      discount_type: discountType,
      discount_value: discountValue,
      min_order_amount: body.min_order_amount ?? 0,
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
      is_active: body.is_active ?? true,
      max_uses: body.max_uses ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("create promo error:", error);
    return NextResponse.json(
      { error: "เพิ่มโค้ดไม่สำเร็จ (อาจซ้ำกับโค้ดเดิม)" },
      { status: 500 },
    );
  }

  return NextResponse.json({ promo: mapPromoCode(data) });
}
