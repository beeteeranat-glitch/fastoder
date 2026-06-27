"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { useCustomerAuth } from "@/context/customer-auth-context";
import {
  formatPhoneInput,
  isValidPhone,
  normalizePhone,
  PHONE_INPUT_MAX_LENGTH,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";

export function RegisterForm() {
  const router = useRouter();
  const { refresh } = useCustomerAuth();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const normalized = normalizePhone(phone);
    if (!name.trim()) {
      setError("กรุณากรอกชื่อ");
      return;
    }
    if (!isValidPhone(normalized)) {
      setError("เบอร์โทรไม่ถูกต้อง");
      return;
    }
    if (!address.trim()) {
      setError("กรุณากรอกที่อยู่");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalized,
          name: name.trim(),
          address: address.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "สมัครสมาชิกไม่สำเร็จ");

      await refresh();
      startTransition(() => {
        router.push("/profile");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
          ชื่อ
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อสำหรับจัดส่ง"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm"
        />
      </label>

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

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
          ที่อยู่
        </span>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล"
          rows={3}
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm"
        />
      </label>

      <button
        type="button"
        disabled={loading}
        onClick={() => void submit()}
        className="w-full rounded-2xl bg-[var(--primary)] py-3.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
      </button>

      <p className="text-center text-xs text-[var(--text-muted)]">
        ถ้าเคยสั่งอาหารในระบบมาก่อน ใช้เบอร์เดิมสมัครได้ — ระบบจะบันทึกชื่อและที่อยู่ให้
      </p>

      <p className="text-center text-sm text-[var(--text-muted)]">
        มีบัญชีแล้ว?{" "}
        <Link href="/login" className="font-semibold text-[var(--primary)]">
          เข้าสู่ระบบ
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
