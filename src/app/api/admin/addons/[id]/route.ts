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
  const updates: Record<string, unknown> = {};

  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.price === "number") updates.price = body.price;
  if (typeof body.is_available === "boolean") updates.is_available = body.is_available;
  if (body.image_url === null || typeof body.image_url === "string") {
    updates.image_url = body.image_url;
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("addons")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "บันทึกเอ็ดออนไม่สำเร็จ" }, { status: 500 });
  }

  await notifyMenuChanged();
  return NextResponse.json({ addon: data });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  }

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase.from("addons").delete().eq("id", id);

  if (error) {
    console.error("delete addon error:", error);
    return NextResponse.json({ error: "ลบเอ็ดออนไม่สำเร็จ" }, { status: 500 });
  }

  await notifyMenuChanged();
  return NextResponse.json({ ok: true });
}
