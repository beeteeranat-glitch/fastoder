"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLoginLockout } from "@/hooks/use-login-lockout";

export function AdminLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const lockout = useLoginLockout("/api/admin/auth/login");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setAttemptsRemaining(null);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as {
        error?: string;
        retryAfterSeconds?: number;
        attemptsRemaining?: number;
      };
      lockout.setLockFromResponse(data.retryAfterSeconds);
      if (typeof data.attemptsRemaining === "number") {
        setAttemptsRemaining(data.attemptsRemaining);
      }
      if (!response.ok) throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      router.replace(nextPath);
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] px-5 py-10">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">FastOrder Admin</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[var(--text)]">เข้าสู่ระบบ</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">สำหรับผู้ดูแลร้านเท่านั้น</p>
        <label className="mt-6 block text-sm font-semibold text-[var(--text)]">
          ชื่อผู้ใช้
          <input
            type="text"
            autoComplete="username"
            required
            disabled={lockout.isLocked}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold text-[var(--text)]">
          รหัสผ่าน
          <input
            type="password"
            autoComplete="current-password"
            required
            disabled={lockout.isLocked}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
          />
        </label>
        {lockout.isLocked ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            ล็อกชั่วคราว · ลองใหม่ได้ใน {lockout.countdown}
          </p>
        ) : null}
        {error ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {attemptsRemaining !== null && !lockout.isLocked ? (
          <p className="mt-2 text-sm font-medium text-amber-800">
            เหลืออีก {attemptsRemaining} ครั้งก่อนล็อก 5 นาที
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending || lockout.isLocked}
          className="mt-6 w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบแอดมิน"}
        </button>
      </form>
    </main>
  );
}
