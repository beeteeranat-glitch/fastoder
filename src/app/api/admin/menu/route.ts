import { NextResponse } from "next/server";
import { fetchAdminMenuFromDb, getStaticMenu } from "@/lib/menu-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(getStaticMenu());
  }

  const menu = await fetchAdminMenuFromDb();
  if (!menu) {
    return NextResponse.json(
      { error: "โหลดเมนูไม่สำเร็จ — รัน migration 002_menu_admin.sql" },
      { status: 500 },
    );
  }

  return NextResponse.json(menu);
}
