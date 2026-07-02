import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  fetchRestaurantFromDb,
  updateRestaurantInDb,
} from "@/lib/restaurant-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const shop = await fetchRestaurantFromDb();
  if (!shop) {
    return NextResponse.json(
      { error: "โหลดข้อมูลร้านไม่สำเร็จ" },
      { status: 500 },
    );
  }

  return NextResponse.json({ shop });
}

export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    is_open?: boolean;
    closing_until?: string | null;
    open_days?: number[];
    logo_url?: string | null;
    bank_name?: string | null;
    bank_account_number?: string | null;
    bank_account_name?: string | null;
    payment_qr_url?: string | null;
    delivery_min_meters?: number;
    delivery_radius_meters?: number;
    delivery_block_meters?: number;
  };

  if (!body.name?.trim() || !body.address?.trim()) {
    return NextResponse.json(
      { error: "กรอกชื่อร้านและที่อยู่" },
      { status: 400 },
    );
  }

  if (
    typeof body.latitude !== "number" ||
    typeof body.longitude !== "number" ||
    body.latitude < -90 ||
    body.latitude > 90 ||
    body.longitude < -180 ||
    body.longitude > 180
  ) {
    return NextResponse.json(
      { error: "พิกัดร้านไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  const openDays = Array.isArray(body.open_days) ? body.open_days : [];
  const validOpenDays =
    openDays.length > 0 &&
    openDays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6);

  if (!validOpenDays) {
    return NextResponse.json(
      { error: "เลือกวันเปิดร้านอย่างน้อย 1 วัน" },
      { status: 400 },
    );
  }

  const deliveryMinMeters = body.delivery_min_meters;
  const deliveryMaxMeters = body.delivery_radius_meters;
  const deliveryBlockMeters = body.delivery_block_meters;
  const hasDeliverySettings =
    deliveryMinMeters !== undefined ||
    deliveryMaxMeters !== undefined ||
    deliveryBlockMeters !== undefined;

  if (
    hasDeliverySettings &&
    (typeof deliveryMinMeters !== "number" ||
      typeof deliveryMaxMeters !== "number" ||
      typeof deliveryBlockMeters !== "number" ||
      !Number.isInteger(deliveryMinMeters) ||
      !Number.isInteger(deliveryMaxMeters) ||
      !Number.isInteger(deliveryBlockMeters) ||
      deliveryMinMeters <= 0 ||
      deliveryMaxMeters <= 0 ||
      deliveryBlockMeters <= 0 ||
      deliveryMaxMeters < deliveryMinMeters)
  ) {
    return NextResponse.json(
      { error: "ระยะจัดส่งต้องเป็นจำนวนเต็มบวก และระยะสูงสุดต้องมากกว่าหรือเท่ากับระยะเริ่มต้น" },
      { status: 400 },
    );
  }

  const shop = await updateRestaurantInDb({
    name: body.name.trim(),
    address: body.address.trim(),
    latitude: body.latitude,
    longitude: body.longitude,
    is_open: typeof body.is_open === "boolean" ? body.is_open : undefined,
    closing_until: body.closing_until ?? null,
    open_days: Array.from(new Set(openDays)).sort((a, b) => a - b),
    logo_url: body.logo_url ?? null,
    bank_name: body.bank_name?.trim() || null,
    bank_account_number: body.bank_account_number?.trim() || null,
    bank_account_name: body.bank_account_name?.trim() || null,
    payment_qr_url: body.payment_qr_url ?? null,
    delivery_min_meters: deliveryMinMeters,
    delivery_radius_meters: deliveryMaxMeters,
    delivery_block_meters: deliveryBlockMeters,
  });

  if (!shop) {
    return NextResponse.json(
      {
        error:
          "บันทึกไม่สำเร็จ — ถ้ายังไม่มีคอลัมน์ใหม่ ให้รัน migration 016_restaurant_open_days.sql",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ shop });
}
