import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isValidReferrerPhone, normalizeReferrerPhone } from "@/lib/promotions";
import { lookupReferrerInDb } from "@/lib/referrer-lookup";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const phone = normalizeReferrerPhone(
    request.nextUrl.searchParams.get("phone") ?? "",
  );

  if (!isValidReferrerPhone(phone)) {
    return NextResponse.json(
      { error: "กรุณากรอกเบอร์โทรให้ถูกต้อง" },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const referrer = await lookupReferrerInDb(phone);
  if (!referrer) {
    return NextResponse.json(
      { error: "ไม่พบเบอร์ผู้แนะนำในระบบ" },
      { status: 404 },
    );
  }

  return NextResponse.json({ referrer });
}
