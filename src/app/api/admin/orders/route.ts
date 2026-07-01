import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { DbOrderStatus } from "@/types/database";

const ACTIVE_STATUSES: DbOrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_DELIVERY",
  "DELIVERING",
];

const ORDER_SELECT =
  "id, order_number, customer_name, customer_phone, order_type, delivery_address, distance_meters, delivery_fee, payable_total, payment_method, status, created_at, updated_at";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit") ?? String(DEFAULT_LIMIT)) || DEFAULT_LIMIT),
  );
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = createServerClient();

  let query = supabase
    .from("orders")
    .select(ORDER_SELECT, { count: "exact" })
    .eq("restaurant_id", RESTAURANT.id)
    .order("created_at", { ascending: false });

  if (status === "active") {
    query = query.in("status", ACTIVE_STATUSES);
  } else if (status && status !== "all") {
    query = query.eq("status", status as DbOrderStatus);
  }

  if (q) {
    const digits = q.replace(/\D/g, "");
    const escaped = q.replace(/[%_,]/g, "");
    const pattern = `%${escaped}%`;
    const filters = [
      `order_number.ilike.${pattern}`,
      `customer_name.ilike.${pattern}`,
      `delivery_address.ilike.${pattern}`,
    ];
    if (digits.length >= 3) {
      filters.push(`customer_phone.ilike.%${digits}%`);
    }
    query = query.or(filters.join(","));
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error("list orders error:", error);
    return NextResponse.json(
      { error: "โหลดออเดอร์ไม่สำเร็จ" },
      { status: 500 },
    );
  }

  const total = count ?? 0;

  return NextResponse.json({
    orders: data ?? [],
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
