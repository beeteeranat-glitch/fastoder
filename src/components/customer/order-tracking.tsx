"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReorderButton } from "@/components/customer/reorder-button";
import {
  PushNotificationPrompt,
  useOrderStatusNotifications,
} from "@/components/customer/order-notifications";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import { estimateDeliveryEtaMinutes, formatEtaLabel } from "@/lib/delivery-eta";
import { formatPrice } from "@/lib/format";
import {
  CUSTOMER_TRACKING_STEPS,
  customerTrackingStepIndex,
  formatOrderDate,
  ORDER_STATUS_LABELS,
} from "@/lib/orders";
import { orderDetailRealtimeSubs } from "@/lib/realtime-subscriptions";
import type { DbOrder, DbOrderItem } from "@/types/database";

const DeliveryMapReadonly = dynamic(
  () =>
    import("@/components/checkout/delivery-map-readonly").then(
      (module) => module.DeliveryMapReadonly,
    ),
  { ssr: false, loading: () => <p className="text-sm text-[var(--text-muted)]">กำลังโหลดแผนที่...</p> },
);

export function OrderTracking({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<DbOrder | null>(null);
  const [items, setItems] = useState<DbOrderItem[]>([]);
  const [restaurant, setRestaurant] = useState<{
    name: string;
    latitude: number;
    longitude: number;
    delivery_radius_meters?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/customer/orders/${orderNumber}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        order?: DbOrder;
        items?: DbOrderItem[];
        restaurant?: typeof restaurant;
        error?: string;
      };
      if (!res.ok || !data.order) {
        throw new Error(data.error ?? "โหลดไม่สำเร็จ");
      }
      setOrder(data.order);
      setItems(data.items ?? []);
      setRestaurant(data.restaurant ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const realtimeSubs = useMemo(
    () => (order ? orderDetailRealtimeSubs(order.id) : []),
    [order],
  );
  useRealtimeRefetch(realtimeSubs, loadOrder);

  useOrderStatusNotifications(orderNumber, order?.status ?? null);

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">กำลังโหลด...</p>;
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error ?? "ไม่พบออเดอร์"}
        </p>
        <Link href="/menu" className="text-sm font-semibold text-[var(--primary)]">
          กลับหน้าเมนู
        </Link>
      </div>
    );
  }

  const stepIndex = customerTrackingStepIndex(order.status);
  const etaMinutes = estimateDeliveryEtaMinutes(
    order.distance_meters,
    order.status,
  );
  const etaLabel = formatEtaLabel(etaMinutes);

  return (
    <div className="space-y-4">
      <PushNotificationPrompt />

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          เลขออเดอร์
        </p>
        <p className="font-display text-3xl font-bold text-[var(--primary)]">
          #{order.order_number}
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {formatOrderDate(order.created_at)}
        </p>
        <p className="mt-3 text-lg font-semibold">
          {ORDER_STATUS_LABELS[order.status]}
        </p>
        {order.status !== "COMPLETED" && order.status !== "CANCELLED" ? (
          <p className="mt-1 text-sm font-semibold text-[var(--primary)]">
            เวลาประมาณการ: {etaLabel}
          </p>
        ) : null}
      </section>

      {order.status !== "CANCELLED" ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-display text-lg font-bold">สถานะออเดอร์</h2>
          <ol className="mt-4 space-y-3">
            {CUSTOMER_TRACKING_STEPS.map((step, index) => {
              const done = stepIndex >= index;
              const active = stepIndex === index;
              return (
                <li key={step.status} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                    }`}
                  >
                    {done ? "✓" : index + 1}
                  </span>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        active ? "text-[var(--primary)]" : "text-[var(--text)]"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {restaurant &&
      order.delivery_latitude !== null &&
      order.delivery_longitude !== null ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="font-display text-lg font-bold">ตำแหน่งจัดส่ง</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {order.delivery_address}
          </p>
          <div className="mt-3">
            <DeliveryMapReadonly
              shopName={restaurant.name}
              shopLat={restaurant.latitude}
              shopLng={restaurant.longitude}
              customerLat={order.delivery_latitude}
              customerLng={order.delivery_longitude}
              maxMeters={restaurant.delivery_radius_meters}
              distanceMeters={order.distance_meters}
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-lg font-bold">รายการสั่งซื้อ</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>
                {item.product_name} × {item.quantity}
              </span>
              <span>{formatPrice(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-[var(--border)] pt-3 font-display text-lg font-bold">
          รวม {formatPrice(order.payable_total)}
        </div>
        {(order.points_earned ?? 0) > 0 ? (
          <p className="mt-2 text-sm font-semibold text-amber-700">
            ได้รับ {order.points_earned} คะแนน
          </p>
        ) : order.status === "COMPLETED" ? null : (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            จะได้รับคะแนนเมื่อออเดอร์สำเร็จ (1 บาท = 1 คะแนน)
          </p>
        )}
      </section>

      <ReorderButton items={items} />

      <div className="flex flex-wrap gap-3">
        <Link
          href="/menu"
          className="inline-flex text-sm font-semibold text-[var(--primary)]"
        >
          ← กลับหน้าเมนู
        </Link>
      </div>
    </div>
  );
}
