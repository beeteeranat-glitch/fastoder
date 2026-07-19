import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
import { isRiderAuthenticated } from "@/lib/rider-session";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  createPrivateOrderFileUrl,
  PRIVATE_ORDER_FILES_BUCKET,
} from "@/lib/private-order-files";

type RouteParams = { params: Promise<{ id: string }> };

const BUCKET = PRIVATE_ORDER_FILES_BUCKET;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!(await isRiderAuthenticated())) {
    return NextResponse.json({ error: "กรุณาเข้าสู่หน้าสำหรับไรเดอร์" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "กรุณาเลือกรูปหลักฐาน" }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "รองรับเฉพาะรูป JPG, PNG หรือ WEBP" },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "รูปมีขนาดเกิน 5 MB" }, { status: 400 });
  }

  const { id } = await params;
  const supabase = createServerClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_type, status")
    .eq("id", id)
    .eq("restaurant_id", RESTAURANT.id)
    .maybeSingle();

  if (orderError || !order || order.order_type !== "delivery") {
    return NextResponse.json({ error: "ไม่พบงานจัดส่ง" }, { status: 404 });
  }
  if (order.status !== "DELIVERING") {
    return NextResponse.json(
      { error: "แนบรูปได้เฉพาะงานที่กำลังจัดส่ง" },
      { status: 400 },
    );
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `delivery-proofs/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    console.error("delivery proof upload error:", uploadError);
    return NextResponse.json(
      { error: "อัปโหลดรูปไม่สำเร็จ — ตรวจสอบ bucket order-documents" },
      { status: 500 },
    );
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ delivery_proof_url: path })
    .eq("id", id)
    .eq("restaurant_id", RESTAURANT.id);

  if (updateError) {
    console.error("save delivery proof error:", updateError);
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json(
      {
        error:
          "บันทึกรูปหลักฐานไม่สำเร็จ — รัน migration 021_delivery_proof.sql ใน Supabase SQL Editor ก่อน",
      },
      { status: 500 },
    );
  }

  const url = await createPrivateOrderFileUrl(path);
  if (!url) {
    return NextResponse.json(
      { error: "สร้างลิงก์เปิดรูปหลักฐานไม่สำเร็จ" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url });
}
