import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { mapPromoCode } from "@/lib/promo-data";
import { normalizeCode } from "@/lib/promotions";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { PromoDiscountType } from "@/types/database";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const { id } = await params;
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

  const updates: Record<string, unknown> = {};
  if (typeof body.code === "string") updates.code = normalizeCode(body.code);
  if (typeof body.label === "string") updates.label = body.label.trim();
  if (body.discount_type) updates.discount_type = body.discount_type;
  if (typeof body.discount_value === "number") {
    updates.discount_value = body.discount_value;
  }
  if (typeof body.min_order_amount === "number") {
    updates.min_order_amount = body.min_order_amount;
  }
  if (body.starts_at !== undefined) updates.starts_at = body.starts_at || null;
  if (body.ends_at !== undefined) updates.ends_at = body.ends_at || null;
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (body.max_uses !== undefined) updates.max_uses = body.max_uses;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "บันทึกโค้ดไม่สำเร็จ" }, { status: 500 });
  }

  return NextResponse.json({ promo: mapPromoCode(data) });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "ลบโค้ดไม่สำเร็จ" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
