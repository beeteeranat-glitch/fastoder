import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fetchCustomerByPhone } from "@/lib/customer-data";
import { createCustomerSession } from "@/lib/customer-session";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { RESTAURANT } from "@/data/menu";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function customerPayload(
  customer: {
    id: string;
    phone: string;
    name: string;
    default_address?: string | null;
    points?: number | null;
    order_count: number;
    total_spent: number;
  },
  fallbackAddress: string,
) {
  return {
    id: customer.id,
    phone: customer.phone,
    name: customer.name,
    defaultAddress: customer.default_address ?? fallbackAddress,
    points: customer.points ?? 0,
    orderCount: customer.order_count,
    totalSpent: customer.total_spent,
  };
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  let body: { phone?: string; name?: string; address?: string };
  try {
    body = (await request.json()) as {
      phone?: string;
      name?: string;
      address?: string;
    };
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const address = body.address?.trim() ?? "";
  const phone = normalizePhone(body.phone ?? "");

  if (!name) {
    return NextResponse.json({ error: "กรุณากรอกชื่อ" }, { status: 400 });
  }
  if (!isValidPhone(phone)) {
    return NextResponse.json(
      { error: "เบอร์โทรไม่ถูกต้อง (ต้อง 10 หลัก ขึ้นต้นด้วย 0)" },
      { status: 400 },
    );
  }
  if (!address) {
    return NextResponse.json({ error: "กรุณากรอกที่อยู่" }, { status: 400 });
  }

  const supabase = createServerClient();

  try {
    const existing = await fetchCustomerByPhone(phone);

    if (existing) {
      const { data: customer, error } = await supabase
        .from("customers")
        .update({ name, default_address: address })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error || !customer) {
        console.error("update customer on register error:", error);
        const message = error?.message ?? "";
        if (message.includes("default_address")) {
          return NextResponse.json(
            {
              error:
                "ฐานข้อมูลยังไม่มีคอลัมน์ที่อยู่ — รัน migration 011_customer_address.sql ใน Supabase SQL Editor",
            },
            { status: 500 },
          );
        }
        return NextResponse.json(
          { error: "สมัครสมาชิกไม่สำเร็จ" },
          { status: 500 },
        );
      }

      await createCustomerSession(phone);

      return NextResponse.json({
        ok: true,
        customer: customerPayload(customer, address),
      });
    }

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        restaurant_id: RESTAURANT.id,
        phone,
        name,
        default_address: address,
      })
      .select("*")
      .single();

    if (error || !customer) {
      console.error("create customer on register error:", error);
      const message = error?.message ?? "";
      if (message.includes("default_address")) {
        return NextResponse.json(
          {
            error:
              "ฐานข้อมูลยังไม่มีคอลัมน์ที่อยู่ — รัน migration 011_customer_address.sql ใน Supabase SQL Editor",
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { error: "สมัครสมาชิกไม่สำเร็จ" },
        { status: 500 },
      );
    }

    await createCustomerSession(phone);

    return NextResponse.json({
      ok: true,
      customer: customerPayload(customer, address),
    });
  } catch (error) {
    console.error("customer register error:", error);
    return NextResponse.json({ error: "สมัครสมาชิกไม่สำเร็จ" }, { status: 500 });
  }
}
