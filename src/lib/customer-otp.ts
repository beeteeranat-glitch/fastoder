import { randomInt } from "crypto";
import { RESTAURANT } from "@/data/menu";
import { createServerClient } from "@/lib/supabase/server";
import { isValidPhone, normalizePhone } from "@/lib/phone";

const OTP_TTL_MS = 5 * 60 * 1000;

function generateOtpCode() {
  const devOtp = process.env.CUSTOMER_DEV_OTP?.trim();
  if (devOtp && /^\d{6}$/.test(devOtp)) return devOtp;
  return String(randomInt(100000, 999999));
}

export async function createCustomerOtp(phone: string) {
  const normalized = normalizePhone(phone);
  if (!isValidPhone(normalized)) {
    throw new Error("เบอร์โทรไม่ถูกต้อง");
  }

  const supabase = createServerClient();
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await supabase
    .from("customer_otp_codes")
    .delete()
    .eq("restaurant_id", RESTAURANT.id)
    .eq("phone", normalized);

  const { error } = await supabase.from("customer_otp_codes").insert({
    restaurant_id: RESTAURANT.id,
    phone: normalized,
    code,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("create otp error:", error);
    throw new Error("ส่ง OTP ไม่สำเร็จ");
  }

  const isDev = process.env.NODE_ENV !== "production";
  return {
    phone: normalized,
    expiresAt,
    devCode: isDev || process.env.CUSTOMER_DEV_OTP ? code : undefined,
  };
}

export async function verifyCustomerOtp(phone: string, code: string) {
  const normalized = normalizePhone(phone);
  if (!isValidPhone(normalized)) {
    throw new Error("เบอร์โทรไม่ถูกต้อง");
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customer_otp_codes")
    .select("id, code, expires_at")
    .eq("restaurant_id", RESTAURANT.id)
    .eq("phone", normalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error("รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    throw new Error("รหัส OTP หมดอายุแล้ว");
  }

  if (data.code !== code.trim()) {
    throw new Error("รหัส OTP ไม่ถูกต้อง");
  }

  await supabase.from("customer_otp_codes").delete().eq("id", data.id);

  return normalized;
}
