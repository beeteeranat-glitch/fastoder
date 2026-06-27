import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
import {
  calcReferrerPoints,
  type ReferrerStat,
} from "@/lib/referrers";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const supabase = createServerClient();

  const { data: referrers } = await supabase
    .from("referrers")
    .select("phone,name")
    .eq("restaurant_id", RESTAURANT.id);

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "order_number, customer_name, customer_phone, referrer_code, status, created_at",
    )
    .eq("restaurant_id", RESTAURANT.id)
    .not("referrer_code", "is", null)
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error(ordersError);

    return NextResponse.json(
      { error: "โหลดข้อมูลไม่สำเร็จ" },
      { status: 500 },
    );
  }

  const grouped = new Map<string, typeof orders>();

  for (const order of orders ?? []) {
    const code = order.referrer_code;

    if (!code) continue;

    if (!grouped.has(code)) {
      grouped.set(code, []);
    }

    grouped.get(code)!.push(order);
  }

  const stats: ReferrerStat[] = [];

  for (const [code, list] of grouped.entries()) {
    const completedOrders = list.filter(
      (o) => o.status !== "CANCELLED",
    );

    const referrer = referrers?.find(
      (r) => r.phone === code,
    );

    stats.push({
      code,
      name: referrer?.name ?? code,
      referralCount: completedOrders.length,
      points: calcReferrerPoints(completedOrders.length),
      recentReferrals: list.slice(0, 10).map((order) => ({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        createdAt: order.created_at,
        status: order.status,
      })),
    });
  }

  stats.sort((a, b) => b.referralCount - a.referralCount);

  return NextResponse.json({
    referrers: stats,
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  let body: {
    phone?: string;
    name?: string;
    rewardAmount?: number;
    isActive?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "ข้อมูลไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  if (!body.phone?.trim() || !body.name?.trim()) {
    return NextResponse.json(
      { error: "กรอกเบอร์และชื่อ" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("referrers")
    .insert({
      restaurant_id: RESTAURANT.id,
      phone: body.phone.trim(),
      name: body.name.trim(),
      reward_amount: body.rewardAmount ?? 20,
      is_active: body.isActive ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error(error);

    return NextResponse.json(
      { error: "เพิ่มผู้แนะนำไม่สำเร็จ" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    referrer: data,
  });
}