import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  clearRiderSession,
  createRiderSession,
  isRiderCredentialsConfigured,
  verifyRiderCredentials,
} from "@/lib/rider-session";
import {
  clearFailedLogins,
  getLoginLock,
  loginRateLimit,
  recordFailedLogin,
} from "@/lib/login-rate-limit";

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} นาที ${remainingSeconds} วินาที`;
}

function lockedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: `บัญชีถูกล็อกชั่วคราว โปรดลองอีกครั้งใน ${formatDuration(retryAfterSeconds)}`,
      retryAfterSeconds,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function GET() {
  try {
    const retryAfterSeconds = await getLoginLock("rider");
    return NextResponse.json({ retryAfterSeconds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ตรวจสอบสถานะล็อกอินไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isRiderCredentialsConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งชื่อผู้ใช้และรหัสผ่านไรเดอร์" },
      { status: 503 },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";
  try {
    const retryAfterSeconds = await getLoginLock("rider");
    if (retryAfterSeconds > 0) return lockedResponse(retryAfterSeconds);

    if (!verifyRiderCredentials(username, password)) {
      const attempt = await recordFailedLogin("rider");
      if (attempt.retryAfterSeconds > 0) {
        return lockedResponse(attempt.retryAfterSeconds);
      }

      return NextResponse.json(
        {
          error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
          attemptsRemaining: Math.max(0, loginRateLimit.maxAttempts - attempt.failedAttempts),
        },
        { status: 401 },
      );
    }

    await clearFailedLogins("rider");
    await createRiderSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  await clearRiderSession();
  return NextResponse.json({ ok: true });
}
