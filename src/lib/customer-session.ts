import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { RESTAURANT } from "@/data/menu";
import { fetchCustomerByPhone } from "@/lib/customer-data";
import type { DbCustomer } from "@/types/database";

const COOKIE_NAME = "customer_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type SessionPayload = {
  phone: string;
  restaurantId: string;
  exp: number;
};

function getSecret() {
  return (
    process.env.CUSTOMER_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "fastorder-dev-session-secret"
  );
}

function signPayload(payload: SessionPayload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function parseToken(token: string): SessionPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  const expected = createHmac("sha256", getSecret()).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload.phone || !payload.restaurantId || !payload.exp) return null;
    if (payload.exp < Date.now()) return null;
    if (payload.restaurantId !== RESTAURANT.id) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createCustomerSession(phone: string) {
  const payload: SessionPayload = {
    phone,
    restaurantId: RESTAURANT.id,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const token = signPayload(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCustomerSessionPhone() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = parseToken(token);
  return payload?.phone ?? null;
}

export async function getAuthenticatedCustomer(): Promise<DbCustomer | null> {
  const phone = await getCustomerSessionPhone();
  if (!phone) return null;
  return fetchCustomerByPhone(phone);
}

export function readCustomerSessionFromToken(token: string) {
  return parseToken(token);
}
