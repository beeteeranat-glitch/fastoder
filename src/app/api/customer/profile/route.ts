import { NextResponse } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/customer-session";
import {
  fetchPointTransactions,
  fetchRewardRedemptions,
} from "@/lib/points-data";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const [transactions, redemptions] = await Promise.all([
    fetchPointTransactions(customer.id),
    fetchRewardRedemptions(customer.id),
  ]);

  return NextResponse.json({
    customer: {
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      defaultAddress: customer.default_address ?? null,
      points: customer.points ?? 0,
      orderCount: customer.order_count,
      totalSpent: customer.total_spent,
      firstOrderAt: customer.first_order_at,
      lastOrderAt: customer.last_order_at,
    },
    transactions,
    redemptions,
  });
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  let body: { name?: string; address?: string };
  try {
    body = (await request.json()) as { name?: string; address?: string };
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const updates: { name?: string; default_address?: string } = {};
  if (body.name?.trim()) updates.name = body.name.trim();
  if (body.address?.trim()) updates.default_address = body.address.trim();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลที่จะบันทึก" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", customer.id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("update customer profile error:", error);
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
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }

  return NextResponse.json({
    customer: {
      id: data.id,
      phone: data.phone,
      name: data.name,
      defaultAddress: data.default_address ?? null,
      points: data.points ?? 0,
      orderCount: data.order_count,
      totalSpent: data.total_spent,
    },
  });
}
