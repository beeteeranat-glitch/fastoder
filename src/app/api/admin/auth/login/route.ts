import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createAdminSession,
  isAdminCredentialsConfigured,
  verifyAdminCredentials,
} from "@/lib/admin-session";
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
    const retryAfterSeconds = await getLoginLock("admin");
    return NextResponse.json({ retryAfterSeconds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ตรวจสอบสถานะล็อกอินไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminCredentialsConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งชื่อผู้ใช้และรหัสผ่านแอดมิน" },
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
    const retryAfterSeconds = await getLoginLock("admin");
    if (retryAfterSeconds > 0) return lockedResponse(retryAfterSeconds);

    if (!verifyAdminCredentials(username, password)) {
      const attempt = await recordFailedLogin("admin");
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

    await clearFailedLogins("admin");
    await createAdminSession(username);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
