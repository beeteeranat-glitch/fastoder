import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
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
    name?: string;
    price?: number;
    image_url?: string | null;
  };

  if (!body.name?.trim() || typeof body.price !== "number") {
    return NextResponse.json({ error: "กรอกชื่อและราคา" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("toppings")
    .insert({
      id: slugId(body.name),
      restaurant_id: RESTAURANT.id,
      name: body.name.trim(),
      price: body.price,
      image_url: body.image_url ?? null,
      is_available: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "เพิ่มท็อปปิ้งไม่สำเร็จ" }, { status: 500 });
  }

  await notifyMenuChanged();
  return NextResponse.json({ topping: data });
}
