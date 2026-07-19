import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "rider_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type RiderSessionPayload = {
  role: "rider";
  exp: number;
};

function getSecret() {
  return (
    process.env.RIDER_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "fastorder-rider-dev-session-secret"
  );
}

function signPayload(payload: RiderSessionPayload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

function readPayload(token: string): RiderSessionPayload | null {
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expected = createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as RiderSessionPayload;
    if (payload.role !== "rider" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function safelyEquals(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);
  return (
    inputBuffer.length === expectedBuffer.length &&
    timingSafeEqual(inputBuffer, expectedBuffer)
  );
}

export function isRiderCredentialsConfigured() {
  return Boolean(
    process.env.RIDER_USERNAME?.trim() && process.env.RIDER_PASSWORD?.trim(),
  );
}

export function verifyRiderCredentials(username: string, password: string) {
  const expectedUsername = process.env.RIDER_USERNAME?.trim();
  const expectedPassword = process.env.RIDER_PASSWORD?.trim();
  return Boolean(
    expectedUsername &&
      expectedPassword &&
      safelyEquals(username, expectedUsername) &&
      safelyEquals(password, expectedPassword),
  );
}

export async function createRiderSession() {
  const cookieStore = await cookies();
  const token = signPayload({
    role: "rider",
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  });

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearRiderSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isRiderAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return Boolean(token && readPayload(token));
}
