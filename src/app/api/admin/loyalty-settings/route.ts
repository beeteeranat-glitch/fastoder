import { NextRequest, NextResponse } from "next/server";
import {
  fetchLoyaltySettings,
  updateLoyaltySettings,
} from "@/lib/loyalty-settings-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  }
  return NextResponse.json({ settings: await fetchLoyaltySettings() });
}

export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const values = [body.earnSpendAmount, body.earnPoints, body.redemptionPoints];
  if (!values.every((value) => typeof value === "number" && Number.isInteger(value) && value > 0)) {
    return NextResponse.json(
      { error: "กรุณากรอกคะแนนและยอดใช้จ่ายเป็นจำนวนเต็มบวก" },
      { status: 400 },
    );
  }

  const settings = await updateLoyaltySettings({
    earnSpendAmount: body.earnSpendAmount as number,
    earnPoints: body.earnPoints as number,
    redemptionPoints: body.redemptionPoints as number,
  });
  if (!settings) {
    return NextResponse.json(
      { error: "บันทึกไม่สำเร็จ — ให้รัน migration 019_loyalty_settings.sql ก่อน" },
      { status: 500 },
    );
  }

  return NextResponse.json({ settings });
}
