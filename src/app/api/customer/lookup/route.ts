import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fetchCustomerByPhone } from "@/lib/customer-data";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const phone = normalizePhone(request.nextUrl.searchParams.get("phone") ?? "");
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "เบอร์โทรไม่ถูกต้อง" }, { status: 400 });
  }

  const customer = await fetchCustomerByPhone(phone);
  if (!customer) {
    return NextResponse.json({ customer: null });
  }

  return NextResponse.json({
    customer: {
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      points: customer.points ?? 0,
    },
  });
}
