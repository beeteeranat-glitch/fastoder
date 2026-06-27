import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
import {
  bangkokEndExclusiveIso,
  bangkokStartIso,
  getBangkokDateString,
  getRevenuePeriodStarts,
  isValidBangkokDateString,
  summarizeRevenue,
  summarizeRevenueRange,
} from "@/lib/revenue-periods";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function fetchCompletedOrders(fromIso: string, toExclusiveIso: string) {
  const supabase = createServerClient();
  return supabase
    .from("orders")
    .select("payable_total, created_at")
    .eq("restaurant_id", RESTAURANT.id)
    .eq("status", "COMPLETED")
    .gte("created_at", fromIso)
    .lt("created_at", toExclusiveIso)
    .order("created_at", { ascending: false });
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  if (fromParam || toParam) {
    if (!fromParam || !toParam) {
      return badRequest("ระบุวันที่เริ่มและวันที่สิ้นสุด");
    }
    if (!isValidBangkokDateString(fromParam) || !isValidBangkokDateString(toParam)) {
      return badRequest("รูปแบบวันที่ไม่ถูกต้อง");
    }
    if (fromParam > toParam) {
      return badRequest("วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด");
    }

    const { data, error } = await fetchCompletedOrders(
      bangkokStartIso(fromParam),
      bangkokEndExclusiveIso(toParam),
    );

    if (error) {
      console.error("custom revenue stats error:", error);
      return NextResponse.json(
        { error: "โหลดยอดรายได้ไม่สำเร็จ" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      custom: summarizeRevenueRange(data ?? [], fromParam, toParam),
      timezone: "Asia/Bangkok",
    });
  }

  const periods = getRevenuePeriodStarts();
  const { data, error } = await fetchCompletedOrders(
    periods.monthly.startIso,
    bangkokEndExclusiveIso(periods.monthly.to),
  );

  if (error) {
    console.error("revenue stats error:", error);
    return NextResponse.json(
      { error: "โหลดยอดรายได้ไม่สำเร็จ" },
      { status: 500 },
    );
  }

  const orders = data ?? [];

  return NextResponse.json({
    daily: summarizeRevenue(
      orders,
      periods.daily.startIso,
      periods.daily.from,
      periods.daily.to,
    ),
    weekly: summarizeRevenue(
      orders,
      periods.weekly.startIso,
      periods.weekly.from,
      periods.weekly.to,
    ),
    monthly: summarizeRevenue(
      orders,
      periods.monthly.startIso,
      periods.monthly.from,
      periods.monthly.to,
    ),
    today: getBangkokDateString(),
    timezone: "Asia/Bangkok",
  });
}
