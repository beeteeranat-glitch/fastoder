import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { notifyMenuChanged } from "@/lib/menu-broadcast";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  }

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const supabase = createServerClient();

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.description === "string") updates.description = body.description.trim();
  if (typeof body.category_id === "string") updates.category_id = body.category_id.trim();
  if (typeof body.base_price === "number") updates.base_price = body.base_price;
  if (typeof body.emoji === "string") updates.emoji = body.emoji;
  if (typeof body.gradient === "string") updates.gradient = body.gradient;
  if (typeof body.is_available === "boolean") updates.is_available = body.is_available;
  if (typeof body.is_recommended === "boolean") updates.is_recommended = body.is_recommended;
  if (typeof body.is_new === "boolean") updates.is_new = body.is_new;
  if (body.image_url === null || typeof body.image_url === "string") {
    updates.image_url = body.image_url;
  }

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "บันทึกสินค้าไม่สำเร็จ" }, { status: 500 });
  }

  await notifyMenuChanged();
  return NextResponse.json({ product: data });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  }

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    console.error("delete product error:", error);
    return NextResponse.json({ error: "ลบเมนูไม่สำเร็จ" }, { status: 500 });
  }

  await notifyMenuChanged();
  return NextResponse.json({ ok: true });
}
