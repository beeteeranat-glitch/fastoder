import { NextResponse } from "next/server";
import { fetchMenuFromDb, getStaticMenu } from "@/lib/menu-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isSupabaseConfigured()) {
    const menu = await fetchMenuFromDb();
    if (menu) {
      return NextResponse.json(menu, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }
  }

  return NextResponse.json(getStaticMenu(), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
