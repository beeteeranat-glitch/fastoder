"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { formatPhoneForDisplay } from "@/lib/phone";
import { formatOrderDate } from "@/lib/orders";
import type { DbCustomer } from "@/types/database";

export function AdminCustomersBoard() {
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [repeatCustomers, setRepeatCustomers] = useState<DbCustomer[]>([]);
  const [stats, setStats] = useState({ totalCustomers: 0, repeatCustomers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/customers");
      const data = (await res.json()) as {
        customers?: DbCustomer[];
        repeatCustomers?: DbCustomer[];
        stats?: typeof stats;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "โหลดไม่สำเร็จ");
      setCustomers(data.customers ?? []);
      setRepeatCustomers(data.repeatCustomers ?? []);
      setStats(data.stats ?? { totalCustomers: 0, repeatCustomers: 0 });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">กำลังโหลด...</p>;
  }

  if (error) {
    return (
      <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--text-muted)]">ลูกค้าทั้งหมด</p>
          <p className="font-display mt-1 text-3xl font-bold">{stats.totalCustomers}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--text-muted)]">ลูกค้าซื้อซ้ำ</p>
          <p className="font-display mt-1 text-3xl font-bold text-sky-700">
            {stats.repeatCustomers}
          </p>
        </div>
      </div>

      <section>
        <h2 className="font-display text-lg font-bold">ลูกค้าซื้อซ้ำ</h2>
        {repeatCustomers.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">ยังไม่มีข้อมูล</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {repeatCustomers.map((customer) => (
              <li
                key={customer.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <p className="font-semibold">{customer.name}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {formatPhoneForDisplay(customer.phone)} · สั่ง {customer.order_count} ครั้ง ·{" "}
                  {formatPrice(customer.total_spent)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">
              👥 รายชื่อลูกค้าล่าสุด
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              ลูกค้าทั้งหมด {customers.length} คน
            </p>
          </div>
        </div>

        <ul className="space-y-3">
          {customers.map((customer) => (
            <li
              key={customer.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <p className="font-semibold text-base">
                      {customer.name}
                    </p>

                    <p className="text-sm text-[var(--text-muted)]">
                      📞 {formatPhoneForDisplay(customer.phone)}
                    </p>

                    {customer.last_order_at && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        🕒 {formatOrderDate(customer.last_order_at)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                    🧾 {customer.order_count} ออเดอร์
                  </span>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    ⭐ {customer.points ?? 0} คะแนน
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
