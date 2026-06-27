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
    logo_url?: string | null;
    bank_name?: string | null;
    bank_account_number?: string | null;
    bank_account_name?: string | null;
    payment_qr_url?: string | null;
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

  const shop = await updateRestaurantInDb({
    name: body.name.trim(),
    address: body.address.trim(),
    latitude: body.latitude,
    longitude: body.longitude,
    logo_url: body.logo_url ?? null,
    bank_name: body.bank_name?.trim() || null,
    bank_account_number: body.bank_account_number?.trim() || null,
    bank_account_name: body.bank_account_name?.trim() || null,
    payment_qr_url: body.payment_qr_url ?? null,
  });

  if (!shop) {
    return NextResponse.json(
      {
        error:
          "บันทึกไม่สำเร็จ — ถ้ายังไม่มีคอลัมน์ใหม่ ให้รัน migration 005_restaurant_logo.sql และ 007_restaurant_payment.sql",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ shop });
}
