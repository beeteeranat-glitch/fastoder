import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
import { getProductVisual } from "@/lib/product-visual";
import { notifyMenuChanged } from "@/lib/menu-broadcast";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function slugId(name: string) {
  return `${name.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`;
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  }

  const body = (await request.json()) as {
    category_id?: string;
    name?: string;
    description?: string;
    base_price?: number;
    emoji?: string;
    gradient?: string;
    image_url?: string | null;
    is_available?: boolean;
    is_recommended?: boolean;
    is_new?: boolean;
  };

  if (!body.category_id?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: "เลือกหมวดและกรอกชื่อเมนู" }, { status: 400 });
  }

  if (typeof body.base_price !== "number" || body.base_price < 0) {
    return NextResponse.json({ error: "กรอกราคาให้ถูกต้อง" }, { status: 400 });
  }

  const supabase = createServerClient();
  const visual = getProductVisual(body.name.trim(), body.category_id);

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", RESTAURANT.id);

  const { data, error } = await supabase
    .from("products")
    .insert({
      id: slugId(body.name),
      restaurant_id: RESTAURANT.id,
      category_id: body.category_id.trim(),
      name: body.name.trim(),
      description: body.description?.trim() || "",
      base_price: body.base_price,
      emoji: body.emoji?.trim() || visual.emoji,
      gradient: body.gradient?.trim() || visual.gradient,
      image_url: body.image_url ?? null,
      is_available: body.is_available ?? true,
      is_recommended: body.is_recommended ?? false,
      is_new: body.is_new ?? false,
      sort_order: count ?? 0,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("create product error:", error);
    return NextResponse.json({ error: "เพิ่มเมนูไม่สำเร็จ" }, { status: 500 });
  }

  await notifyMenuChanged();
  return NextResponse.json({ product: data });
}
