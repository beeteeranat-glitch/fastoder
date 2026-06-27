"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";
import { useCustomerAuth } from "@/context/customer-auth-context";
import {
  formatPhoneInput,
  isValidPhone,
  normalizePhone,
  PHONE_INPUT_MAX_LENGTH,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/profile";
  const { refresh } = useCustomerAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) {
      setError("เบอร์โทรไม่ถูกต้อง");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");

      await refresh();
      const destination = nextPath.startsWith("/") ? nextPath : "/profile";
      startTransition(() => {
        router.push(destination);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
          เบอร์โทรศัพท์
        </span>
        <input
          type="tel"
          inputMode="numeric"
          value={formatPhoneInput(phone)}
          maxLength={PHONE_INPUT_MAX_LENGTH}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={PHONE_PLACEHOLDER}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm"
        />
      </label>

      <button
        type="button"
        disabled={loading}
        onClick={() => void submit()}
        className="w-full rounded-2xl bg-[var(--primary)] py-3.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>

      <p className="text-center text-sm text-[var(--text-muted)]">
        ยังไม่มีบัญชี?{" "}
        <Link href="/register" className="font-semibold text-[var(--primary)]">
          สมัครสมาชิก
        </Link>
      </p>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
