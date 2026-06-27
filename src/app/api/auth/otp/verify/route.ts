import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fetchCustomerByPhone } from "@/lib/customer-data";
import { verifyCustomerOtp } from "@/lib/customer-otp";
import { createCustomerSession } from "@/lib/customer-session";
import { RESTAURANT } from "@/data/menu";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  let body: { phone?: string; code?: string; name?: string };
  try {
    body = (await request.json()) as {
      phone?: string;
      code?: string;
      name?: string;
    };
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  if (!body.phone?.trim() || !body.code?.trim()) {
    return NextResponse.json({ error: "กรอกเบอร์และ OTP" }, { status: 400 });
  }

  try {
    const phone = await verifyCustomerOtp(body.phone, body.code);
    const supabase = createServerClient();

    let customer = await fetchCustomerByPhone(phone);
    if (!customer) {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          restaurant_id: RESTAURANT.id,
          phone,
          name: body.name?.trim() || "ลูกค้า",
        })
        .select("*")
        .single();

      if (error) {
        console.error("create customer on login error:", error);
        return NextResponse.json(
          { error: "สร้างโปรไฟล์ไม่สำเร็จ" },
          { status: 500 },
        );
      }
      customer = data;
    } else if (body.name?.trim() && body.name.trim() !== customer.name) {
      const { data } = await supabase
        .from("customers")
        .update({ name: body.name.trim() })
        .eq("id", customer.id)
        .select("*")
        .single();
      if (data) customer = data;
    }

    await createCustomerSession(phone);

    if (!customer) {
      return NextResponse.json({ error: "ไม่พบข้อมูลลูกค้า" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        points: customer.points ?? 0,
        orderCount: customer.order_count,
        totalSpent: customer.total_spent,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ยืนยัน OTP ไม่สำเร็จ" },
      { status: 400 },
    );
  }
}
