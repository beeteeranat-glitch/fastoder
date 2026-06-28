import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createCustomerOtp } from "@/lib/customer-otp";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const LOGIN_DISABLED = true;

export async function POST(request: NextRequest) {
  if (LOGIN_DISABLED) {
    return NextResponse.json(
      { error: "ระบบล็อกอินถูกปิดชั่วคราว" },
      { status: 503 },
    );
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  let body: { phone?: string };
  try {
    body = (await request.json()) as { phone?: string };
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const result = await createCustomerOtp(body.phone ?? "");
    return NextResponse.json({
      ok: true,
      phone: result.phone,
      expiresAt: result.expiresAt,
      devCode: result.devCode,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ส่ง OTP ไม่สำเร็จ" },
      { status: 400 },
    );
  }
}
