"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { formatOrderDate } from "@/lib/orders";
import { FREE_DRINK_POINTS } from "@/lib/points-data";
import type { DbPointTransaction, DbRewardRedemption } from "@/types/database";

export function RewardsView() {
  const { customer, loading: authLoading } = useCustomerAuth();
  const [transactions, setTransactions] = useState<DbPointTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<DbRewardRedemption[]>([]);
  const [promos, setPromos] = useState<
    {
      code: string;
      label: string;
      discount_type: string;
      discount_value: number;
      min_order_amount: number | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [profileRes, promosRes] = await Promise.all([
        fetch("/api/customer/profile", { cache: "no-store" }),
        fetch("/api/customer/promos", { cache: "no-store" }),
      ]);
      const data = (await profileRes.json()) as {
        transactions?: DbPointTransaction[];
        redemptions?: DbRewardRedemption[];
      };
      const promosData = (await promosRes.json()) as {
        promos?: typeof promos;
      };
      setTransactions(data.transactions ?? []);
      setRedemptions(data.redemptions ?? []);
      setPromos(promosData.promos ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && customer) void load();
    if (!authLoading && !customer) setLoading(false);
  }, [authLoading, customer, load]);

  if (authLoading || loading) {
    return <p className="text-sm text-[var(--text-muted)]">กำลังโหลด...</p>;
  }

  if (!customer) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <p className="text-sm text-[var(--text-muted)]">กรุณาเข้าสู่ระบบก่อน</p>
        <Link href="/login" className="mt-4 inline-flex text-sm font-semibold text-[var(--primary)]">
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  const canRedeem = customer.points >= FREE_DRINK_POINTS;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-amber-50 to-orange-50 p-5">
        <p className="text-sm font-semibold text-amber-800">คะแนนคงเหลือ</p>
        <p className="font-display mt-1 text-4xl font-bold text-amber-600">
          {customer.points}
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-lg font-bold">แลกเครื่องดื่มฟรี</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          สะสม 10 คะแนนทุก 100 บาท · ใช้ {FREE_DRINK_POINTS} คะแนน ต่อ 1 สิทธิ์ ·
          ครอบคลุมราคาเครื่องดื่มหลัก Topping และ Add-on คิดเงินเพิ่มตามปกติ
        </p>
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${
            canRedeem
              ? "bg-emerald-50 text-emerald-700"
              : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
          }`}
        >
          {canRedeem
            ? "พร้อมแลกสิทธิ์ — เลือกใช้ตอน Checkout"
            : `ต้องมีอย่างน้อย ${FREE_DRINK_POINTS} คะแนน`}
        </p>
        <Link
          href="/menu"
          className="mt-3 inline-flex text-sm font-semibold text-[var(--primary)]"
        >
          ไปเลือกเมนู →
        </Link>
      </section>

      {promos.length > 0 ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-display text-lg font-bold">คูปอง / โปรโมชัน</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            ใส่รหัสตอน Checkout เพื่อรับส่วนลด
          </p>
          <ul className="mt-3 space-y-2">
            {promos.map((promo) => (
              <li
                key={promo.code}
                className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3"
              >
                <p className="font-semibold">{promo.label}</p>
                <p className="mt-1 font-mono text-sm text-[var(--primary)]">
                  {promo.code}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {promo.discount_type === "percent"
                    ? `ลด ${promo.discount_value}%`
                    : `ลด ${promo.discount_value} บาท`}
                  {promo.min_order_amount
                    ? ` · ขั้นต่ำ ${promo.min_order_amount} บาท`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-lg font-bold">ประวัติได้รับ/ใช้คะแนน</h2>
        {transactions.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">ยังไม่มีประวัติ</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {tx.description ??
                      (tx.type === "earn" ? "ได้รับคะแนน" : "ใช้คะแนน")}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatOrderDate(tx.created_at)}
                  </p>
                </div>
                <span
                  className={`font-bold ${
                    tx.points >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {tx.points >= 0 ? "+" : ""}
                  {tx.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-lg font-bold">ประวัติการแลกรางวัล</h2>
        {redemptions.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">ยังไม่เคยแลก</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {redemptions.map((item) => (
              <li
                key={item.id}
                className="rounded-xl bg-[var(--surface-muted)] px-3 py-2"
              >
                <p className="font-semibold">แลกเครื่องดื่มฟรี</p>
                <p className="text-xs text-[var(--text-muted)]">
                  ใช้ {item.points_used} คะแนน · {formatOrderDate(item.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
