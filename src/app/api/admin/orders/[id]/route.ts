import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { canTransitionStatus } from "@/lib/orders";
import { adjustCustomerOnOrderStatusChange } from "@/lib/customer-data";
import { lookupReferrerInDb } from "@/lib/referrer-lookup";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { DbOrderStatus } from "@/types/database";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("get order items error:", itemsError);
    return NextResponse.json(
      { error: "โหลดรายการไม่สำเร็จ" },
      { status: 500 },
    );
  }

  let referrerDisplayName: string | null = null;
  if (order.referrer_code) {
    const referrer = await lookupReferrerInDb(order.referrer_code);
    referrerDisplayName = referrer?.name ?? order.referrer_code;
  }

  return NextResponse.json({
    order,
    items: items ?? [],
    referrerDisplayName,
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const { id } = await params;
  let body: { status?: DbOrderStatus };

  try {
    body = (await request.json()) as { status?: DbOrderStatus };
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  if (!body.status) {
    return NextResponse.json({ error: "ระบุสถานะไม่ครบ" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: current, error: fetchError } = await supabase
    .from("orders")
    .select("status, customer_phone, payable_total")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
  }

  if (!canTransitionStatus(current.status, body.status)) {
    return NextResponse.json(
      { error: "เปลี่ยนสถานะไม่ได้จากสถานะปัจจุบัน" },
      { status: 400 },
    );
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update({ status: body.status })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !order) {
    console.error("update order error:", error);
    return NextResponse.json(
      { error: "อัปเดตสถานะไม่สำเร็จ" },
      { status: 500 },
    );
  }

  await adjustCustomerOnOrderStatusChange({
    phone: current.customer_phone,
    previousStatus: current.status,
    nextStatus: body.status,
    payableTotal: current.payable_total,
    orderId: id,
  });

  return NextResponse.json({ order });
}
