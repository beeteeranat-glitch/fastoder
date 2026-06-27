import { NextResponse } from "next/server";
import { fetchBestSellers } from "@/lib/best-sellers";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ bestSellers: [] });
  }

  const bestSellers = await fetchBestSellers(10);
  return NextResponse.json({ bestSellers });
}
