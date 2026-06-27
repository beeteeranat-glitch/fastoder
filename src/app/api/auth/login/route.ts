import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fetchCustomerByPhone } from "@/lib/customer-data";
import { createCustomerSession } from "@/lib/customer-session";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST(request: NextRequest) {
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

  const phone = normalizePhone(body.phone ?? "");

  if (!isValidPhone(phone)) {
    return NextResponse.json(
      { error: "เบอร์โทรไม่ถูกต้อง (ต้อง 10 หลัก ขึ้นต้นด้วย 0)" },
      { status: 400 },
    );
  }

  try {
    const customer = await fetchCustomerByPhone(phone);
    if (!customer) {
      return NextResponse.json(
        { error: "ไม่พบเบอร์นี้ กรุณาสมัครสมาชิกก่อน" },
        { status: 404 },
      );
    }

    await createCustomerSession(phone);

    return NextResponse.json({
      ok: true,
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        defaultAddress: customer.default_address ?? null,
        points: customer.points ?? 0,
        orderCount: customer.order_count,
        totalSpent: customer.total_spent,
      },
    });
  } catch (error) {
    console.error("customer login error:", error);
    return NextResponse.json({ error: "เข้าสู่ระบบไม่สำเร็จ" }, { status: 500 });
  }
}
