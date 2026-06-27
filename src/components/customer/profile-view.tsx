"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { formatPrice } from "@/lib/format";
import { formatPhoneForDisplay } from "@/lib/phone";
import { FREE_DRINK_POINTS } from "@/lib/points-data";

export function ProfileView() {
  const { customer, loading, logout, refresh } = useCustomerAuth();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setAddress(customer.defaultAddress ?? "");
    }
  }, [customer]);

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">กำลังโหลด...</p>;
  }

  if (!customer) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <p className="text-sm text-[var(--text-muted)]">กรุณาเข้าสู่ระบบก่อน</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex justify-center rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white"
          >
            เข้าสู่ระบบ
          </Link>
          <Link
            href="/register"
            className="inline-flex justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-bold text-[var(--text)]"
          >
            สมัครสมาชิก
          </Link>
        </div>
      </div>
    );
  }

  const saveProfile = async () => {
    if (!name.trim()) {
      setMessage("กรุณากรอกชื่อ");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      await refresh();
      setMessage("บันทึกแล้ว");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          โปรไฟล์
        </p>
        <p className="font-display mt-1 text-2xl font-bold text-[var(--text)]">
          {customer.name}
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {formatPhoneForDisplay(customer.phone)}
        </p>
        {customer.defaultAddress ? (
          <p className="mt-2 text-sm text-[var(--text)]">{customer.defaultAddress}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-amber-50 to-orange-50 p-5">
        <p className="text-sm font-semibold text-amber-800">คะแนนคงเหลือ</p>
        <p className="font-display mt-1 text-4xl font-bold text-amber-600">
          {customer.points}
        </p>
        <p className="mt-2 text-xs text-amber-800/80">
          สะสม 10 คะแนนทุก 100 บาท · แลกเครื่องดื่มฟรีได้ที่ {FREE_DRINK_POINTS} คะแนน
        </p>
        <Link
          href="/rewards"
          className="mt-3 inline-flex text-sm font-semibold text-[var(--primary)]"
        >
          ดูสิทธิ์และประวัติคะแนน →
        </Link>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[var(--text-muted)]">สั่งซื้อแล้ว</p>
            <p className="font-display text-xl font-bold">{customer.orderCount}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">ยอดใช้จ่ายรวม</p>
            <p className="font-display text-xl font-bold">
              {formatPrice(customer.totalSpent)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
            ชื่อ
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm"
          />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
            ที่อยู่
          </span>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveProfile()}
          className="mt-3 w-full rounded-2xl bg-[var(--primary)] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
        </button>
        {message ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">{message}</p>
        ) : null}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/orders"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center text-sm font-semibold"
        >
          ประวัติสั่งซื้อ
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
