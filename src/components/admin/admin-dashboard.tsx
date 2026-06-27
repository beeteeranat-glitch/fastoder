"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminRevenuePanel } from "@/components/admin/admin-revenue-panel";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import { formatPrice } from "@/lib/format";
import { formatOrderDate } from "@/lib/orders";
import {
  REFERRAL_POINTS_PER_CUSTOMER,
  type ReferrerStat,
} from "@/lib/referrers";
import { ORDERS_REALTIME_SUBS } from "@/lib/realtime-subscriptions";
import type { DbOrder, DbOrderStatus } from "@/types/database";

export function AdminDashboard() {
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [referrers, setReferrers] = useState<ReferrerStat[]>([]);
  const [revenueRefreshKey, setRevenueRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [ordersRes, referrersRes] = await Promise.all([
        fetch("/api/admin/orders?status=active"),
        fetch("/api/admin/referrers"),
      ]);
      const ordersData = (await ordersRes.json()) as {
        orders?: DbOrder[];
        error?: string;
      };
      const referrersData = (await referrersRes.json()) as {
        referrers?: ReferrerStat[];
        error?: string;
      };
      if (!ordersRes.ok) throw new Error(ordersData.error ?? "โหลดไม่สำเร็จ");
      setOrders(ordersData.orders ?? []);
      setReferrers(referrersData.referrers ?? []);
      setRevenueRefreshKey((value) => value + 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useRealtimeRefetch(ORDERS_REALTIME_SUBS, loadData);

  const counts = useMemo(() => {
    const initial: Record<DbOrderStatus, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      PREPARING: 0,
      READY_FOR_DELIVERY: 0,
      DELIVERING: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const order of orders) {
      initial[order.status] += 1;
    }
    return initial;
  }, [orders]);

  const cards = [
    { label: "รอร้านยืนยัน", value: counts.PENDING, tone: "text-amber-700" },
  ];

  return (
    <div className="space-y-6">
      <AdminRevenuePanel refreshKey={revenueRefreshKey} />

      <div className="grid gap-3 sm:grid-cols-1">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <p className="text-sm text-[var(--text-muted)]">{card.label}</p>
            <p className={`font-display mt-1 text-3xl font-bold ${card.tone}`}>
              {loading ? "…" : card.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-[var(--text)]">
            ออเดอร์ที่ต้องดำเนินการ
          </h2>
          <Link
            href="/admin/orders"
            className="text-sm font-semibold text-[var(--primary)]"
          >
            ดูทั้งหมด
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">กำลังโหลด...</p>
        ) : error ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : orders.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            ยังไม่มีออเดอร์ที่ต้องดำเนินการ
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {orders.slice(0, 8).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface-muted)] px-4 py-3 transition hover:bg-[var(--primary-soft)]"
                >
                  <div>
                    <p className="font-semibold text-[var(--text)]">
                      #{order.order_number} · {order.customer_name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatOrderDate(order.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[var(--text)]">
                      {formatPrice(order.payable_total)}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[var(--text)]">
              ผู้แนะนำลูกค้า
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              1 คน = {REFERRAL_POINTS_PER_CUSTOMER} คะแนน
            </p>
          </div>
          <Link
            href="/admin/referrers"
            className="text-sm font-semibold text-[var(--primary)]"
          >
            ดูทั้งหมด
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">กำลังโหลด...</p>
        ) : referrers.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            ยังไม่มีคะแนนผู้แนะนำ
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {referrers.slice(0, 5).map((referrer, index) => (
              <li
                key={referrer.code}
                className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-muted)] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-bold text-[var(--primary)]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--text)]">
                      {referrer.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      แนะนำ {referrer.referralCount} คน
                    </p>
                  </div>
                </div>
                <p className="font-display text-lg font-bold text-amber-600">
                  {referrer.points} คะแนน
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
