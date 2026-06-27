"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import { formatPrice } from "@/lib/format";
import {
  CUSTOMER_TRACKING_STEPS,
  customerTrackingStepIndex,
  formatOrderDate,
  isActiveOrderStatus,
} from "@/lib/orders";
import { customerOrdersRealtimeSubs } from "@/lib/realtime-subscriptions";
import type { DbOrder } from "@/types/database";

function OrderProgress({ order }: { order: DbOrder }) {
  if (order.status === "CANCELLED" || order.status === "COMPLETED") {
    return null;
  }

  const stepIndex = customerTrackingStepIndex(order.status);
  const totalSteps = CUSTOMER_TRACKING_STEPS.length;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1">
        {CUSTOMER_TRACKING_STEPS.map((step, index) => {
          const done = stepIndex >= index;
          const active = stepIndex === index;
          return (
            <div key={step.status} className="flex flex-1 items-center gap-1">
              <span
                className={`flex h-2 w-2 shrink-0 rounded-full ${
                  done ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                } ${active ? "ring-2 ring-[var(--primary)]/30" : ""}`}
                title={step.label}
              />
              {index < totalSteps - 1 ? (
                <span
                  className={`h-0.5 flex-1 rounded-full ${
                    stepIndex > index ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs font-medium text-[var(--primary)]">
        ขั้นตอน {stepIndex + 1}/{totalSteps} ·{" "}
        {CUSTOMER_TRACKING_STEPS[stepIndex]?.label ?? "กำลังดำเนินการ"}
      </p>
    </div>
  );
}

function OrderCard({ order }: { order: DbOrder }) {
  const isActive = isActiveOrderStatus(order.status);

  return (
    <Link
      href={`/orders/${order.order_number}`}
      className={`block rounded-2xl border p-4 transition hover:bg-[var(--primary-soft)]/40 ${
        isActive
          ? "border-[var(--primary)]/40 bg-[var(--primary-soft)]/30"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold text-[var(--primary)]">
            #{order.order_number}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {formatOrderDate(order.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="font-semibold">{formatPrice(order.payable_total)}</p>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <OrderProgress order={order} />

      {order.status === "COMPLETED" ? (
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          ✓ ออเดอร์สำเร็จแล้ว
        </p>
      ) : null}

      {isActive ? (
        <p className="mt-2 text-xs font-semibold text-[var(--primary)]">
          แตะเพื่อติดตามสถานะ →
        </p>
      ) : null}

      {(order.points_earned ?? 0) > 0 ? (
        <p className="mt-1 text-xs font-semibold text-amber-700">
          +{order.points_earned} คะแนน
        </p>
      ) : null}
    </Link>
  );
}

export function OrdersList() {
  const { customer, loading: authLoading } = useCustomerAuth();
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/customer/orders", { cache: "no-store" });
      const data = (await res.json()) as { orders?: DbOrder[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "โหลดไม่สำเร็จ");
      setOrders(data.orders ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && customer) void loadOrders();
    if (!authLoading && !customer) setLoading(false);
  }, [authLoading, customer, loadOrders]);

  const ordersRealtimeSubs = useMemo(
    () => (customer ? customerOrdersRealtimeSubs(customer.phone) : []),
    [customer?.phone],
  );
  useRealtimeRefetch(ordersRealtimeSubs, loadOrders, Boolean(customer?.phone));

  const { activeOrders, pastOrders } = useMemo(() => {
    const active: DbOrder[] = [];
    const past: DbOrder[] = [];
    for (const order of orders) {
      if (isActiveOrderStatus(order.status)) active.push(order);
      else past.push(order);
    }
    return { activeOrders: active, pastOrders: past };
  }, [orders]);

  if (authLoading || loading) {
    return <p className="text-sm text-[var(--text-muted)]">กำลังโหลด...</p>;
  }

  if (!customer) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          เข้าสู่ระบบเพื่อดูประวัติออเดอร์ของคุณ
        </p>
        <Link
          href="/login?next=/orders"
          className="mt-4 inline-flex rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {error}
      </p>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">ยังไม่มีประวัติการสั่งซื้อ</p>
        <Link
          href="/menu"
          className="mt-3 inline-flex text-sm font-semibold text-[var(--primary)]"
        >
          ไปเลือกเมนู
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeOrders.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
            กำลังดำเนินการ ({activeOrders.length})
          </h2>
          <ul className="space-y-3">
            {activeOrders.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pastOrders.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            ประวัติออเดอร์
          </h2>
          <ul className="space-y-3">
            {pastOrders.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
