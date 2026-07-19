import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
import { adjustCustomerOnOrderStatusChange } from "@/lib/customer-data";
import { isRiderAuthenticated } from "@/lib/rider-session";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { withSignedOrderMedia } from "@/lib/private-order-files";
import type { DbOrderStatus } from "@/types/database";

type RouteParams = { params: Promise<{ id: string }> };

const RIDER_TRANSITIONS: Record<"READY_FOR_DELIVERY" | "DELIVERING", DbOrderStatus> = {
  READY_FOR_DELIVERY: "DELIVERING",
  DELIVERING: "COMPLETED",
};

const RIDER_ORDER_SELECT =
  "id, order_number, customer_name, customer_phone, delivery_address, delivery_latitude, delivery_longitude, distance_meters, payable_total, payment_method, customer_note, delivery_proof_url, status, created_at";

export async function GET(_request: NextRequest, { params }: RouteParams) {
  if (!(await isRiderAuthenticated())) {
    return NextResponse.json({ error: "กรุณาเข้าสู่หน้าสำหรับไรเดอร์" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  }

  const { id } = await params;
  const { data: order, error } = await createServerClient()
    .from("orders")
    .select(RIDER_ORDER_SELECT)
    .eq("id", id)
    .eq("restaurant_id", RESTAURANT.id)
    .eq("order_type", "delivery")
    .in("status", ["READY_FOR_DELIVERY", "DELIVERING"])
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: "ไม่พบงานจัดส่งนี้" }, { status: 404 });
  }

  return NextResponse.json({ order: await withSignedOrderMedia(order) });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!(await isRiderAuthenticated())) {
    return NextResponse.json({ error: "กรุณาเข้าสู่หน้าสำหรับไรเดอร์" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  }

  let body: { status?: DbOrderStatus };
  try {
    body = (await request.json()) as { status?: DbOrderStatus };
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const { id } = await params;
  const supabase = createServerClient();
  const { data: current, error: currentError } = await supabase
    .from("orders")
    .select("status, order_type, customer_phone, payable_total, delivery_proof_url")
    .eq("id", id)
    .eq("restaurant_id", RESTAURANT.id)
    .maybeSingle();

  if (currentError || !current || current.order_type !== "delivery") {
    return NextResponse.json({ error: "ไม่พบงานจัดส่ง" }, { status: 404 });
  }

  let allowedStatus: DbOrderStatus | null = null;
  if (current.status === "READY_FOR_DELIVERY") {
    allowedStatus = RIDER_TRANSITIONS.READY_FOR_DELIVERY;
  } else if (current.status === "DELIVERING") {
    allowedStatus = RIDER_TRANSITIONS.DELIVERING;
  }
  if (!allowedStatus || body.status !== allowedStatus) {
    return NextResponse.json({ error: "ไม่สามารถเปลี่ยนสถานะนี้ได้" }, { status: 400 });
  }

  if (body.status === "COMPLETED" && !current.delivery_proof_url) {
    return NextResponse.json(
      { error: "กรุณาแนบรูปหลักฐานก่อนกดส่งสำเร็จ" },
      { status: 400 },
    );
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update({ status: body.status })
    .eq("id", id)
    .eq("restaurant_id", RESTAURANT.id)
    .select("id, status")
    .single();

  if (error || !order) {
    console.error("update rider order error:", error);
    return NextResponse.json({ error: "อัปเดตสถานะไม่สำเร็จ" }, { status: 500 });
  }

  await adjustCustomerOnOrderStatusChange({
    phone: current.customer_phone,
    previousStatus: current.status as DbOrderStatus,
    nextStatus: body.status,
    payableTotal: current.payable_total,
    orderId: id,
  });

  return NextResponse.json({ order });
}
