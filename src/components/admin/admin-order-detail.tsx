"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import { formatPrice } from "@/lib/format";
import { formatDistance } from "@/lib/delivery-fee";
import { formatPhoneForDisplay } from "@/lib/phone";
import {
  CUSTOMER_TRACKING_STEPS,
  customerTrackingStepIndex,
  formatOrderDate,
  getNextAdminStatus,
  orderStatusLabelForType,
  orderTypeLabel,
  paymentMethodLabel,
  statusActionLabelForType,
} from "@/lib/orders";
import { orderDetailRealtimeSubs } from "@/lib/realtime-subscriptions";
import { REFERRAL_POINTS_PER_CUSTOMER } from "@/lib/referrers";
import type { DbOrder, DbOrderItem, DbOrderStatus } from "@/types/database";

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<DbOrder | null>(null);
  const [items, setItems] = useState<DbOrderItem[]>([]);
  const [referrerDisplayName, setReferrerDisplayName] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<DbOrderStatus | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const data = (await res.json()) as {
        order?: DbOrder;
        items?: DbOrderItem[];
        referrerDisplayName?: string | null;
        error?: string;
      };
      if (!res.ok || !data.order) {
        throw new Error(data.error ?? "โหลดไม่สำเร็จ");
      }
      setOrder(data.order);
      setItems(data.items ?? []);
      setReferrerDisplayName(data.referrerDisplayName ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const orderRealtimeSubs = useMemo(
    () => orderDetailRealtimeSubs(orderId),
    [orderId],
  );
  useRealtimeRefetch(orderRealtimeSubs, loadOrder);

  const updateStatus = async (status: DbOrderStatus) => {
    if (!order || updating) return;
    setUpdating(status);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { order?: DbOrder; error?: string };
      if (!res.ok || !data.order) {
        throw new Error(data.error ?? "อัปเดตไม่สำเร็จ");
      }
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">กำลังโหลด...</p>;
  }

  if (error && !order) {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
        <Link
          href="/admin/orders"
          className="text-sm font-semibold text-[var(--primary)]"
        >
          ← กลับรายการออเดอร์
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const nextStatus = getNextAdminStatus(order.status);
  const isPickup = order.order_type === "pickup";
  const deliveryMinimumSurcharge = Math.max(
    0,
    order.payable_total -
      (order.food_total +
        order.delivery_fee -
        order.discount_total -
        (order.reward_discount ?? 0)),
  );

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Link
          href="/admin/orders"
          className="inline-flex text-sm font-semibold text-[var(--primary)]"
        >
          ← กลับรายการออเดอร์
        </Link>
      </div>

      <div id="order-receipt" className="space-y-4">

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-bold text-[var(--text)]">
                #{order.order_number}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {formatOrderDate(order.created_at)}
              </p>
            </div>
            <div className="flex max-w-full flex-col items-start gap-2 sm:items-end">
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    isPickup
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                  }`}
                >
                  {orderTypeLabel(order.order_type)}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="max-w-md break-words text-left text-xs font-medium text-[var(--text-muted)] sm:text-right">
                {isPickup ? "จุดรับสินค้า" : "ที่อยู่จัดส่ง"}:{" "}
                <span className="text-[var(--text)]">{order.delivery_address}</span>
              </p>
            </div>
          </div>

          {order.status === "CANCELLED" ? (
            <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              ออเดอร์นี้ถูกยกเลิกแล้ว
            </p>
          ) : (
            <div className="space-y-4">
           <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 print:hidden">
                <h3 className="mb-4 font-display text-lg font-bold text-[var(--text)]">
                  สถานะออเดอร์
                </h3>
                <div className="flex flex-col gap-4">
                  {CUSTOMER_TRACKING_STEPS.map((step, index) => {
                    const stepIndex = customerTrackingStepIndex(order.status);
                    // ปรับเงื่อนไข: ถ้าระดับสถานะปัจจุบันมากกว่าหรือเท่ากับ index ถือว่าเสร็จสิ้น/ผ่านมาแล้ว
                    const isDone = stepIndex >= index; 

                    return (
                      <div key={step.status} className="flex items-center gap-3">
                        {isDone ? (
                          // วงกลมสีฟ้า + ไอคอนเช็คถูก
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        ) : (
                          // วงกลมสีเทา + ตัวเลข
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                            {index + 1}
                          </div>
                        )}
                        
                        {/* ข้อความสถานะ */}
                        <span
                          className={`text-sm font-medium ${
                            isDone ? "text-[var(--primary)]" : "text-[var(--text)]"
                          }`}
                        >
                          {orderStatusLabelForType(step.status, order.order_type)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {nextStatus ? (
                <div className="mt-3 grid grid-cols-1 gap-3 print:hidden">
                  <button
                    type="button"
                    disabled={updating !== null}
                    onClick={() => void updateStatus(nextStatus)}
                    className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {updating === nextStatus
                      ? "กำลังอัปเดต..."
                      : statusActionLabelForType(nextStatus, order.order_type)}
                  </button>

                  {order.status === "PENDING" ? (
                    <button
                      type="button"
                      disabled={updating !== null}
                      onClick={() => void updateStatus("CANCELLED")}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      {updating === "CANCELLED"
                        ? "กำลังอัปเดต..."
                        : "ยกเลิกออเดอร์"}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          {error ? (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-display text-lg font-bold text-[var(--text)]">
              ข้อมูลลูกค้า
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">ชื่อ</dt>
                <dd className="font-semibold text-[var(--text)]">
                  {order.customer_name}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">เบอร์โทร</dt>
                <dd className="font-semibold text-[var(--text)]">
                  {formatPhoneForDisplay(order.customer_phone)}
                </dd>
              </div>
              {!isPickup ? (
                <div>
                  <dt className="text-[var(--text-muted)]">ที่อยู่จัดส่ง</dt>
                  <dd className="text-[var(--text)]">{order.delivery_address}</dd>
                </div>
              ) : null}
              {order.order_type === "delivery" && order.distance_meters !== null ? (
                <div>
                  <dt className="text-[var(--text-muted)]">ระยะทางจัดส่ง</dt>
                  <dd className="font-semibold text-[var(--text)]">
                    {formatDistance(order.distance_meters)}
                    <span className="ml-1 font-normal text-[var(--text-muted)]">
                      (ค่าส่ง {formatPrice(order.delivery_fee)})
                    </span>
                  </dd>
                </div>
              ) : null}
              {order.order_type === "delivery" &&
                order.delivery_latitude !== null &&
                order.delivery_longitude !== null ? (
                <div>
                  <dt className="text-[var(--text-muted)]">พิกัด</dt>
                  <dd>
                    <a
                      href={`https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
                    >
                      เปิดใน Google Maps
                    </a>
                  </dd>
                </div>
              ) : null}
              {order.customer_note ? (
                <div>
                  <dt className="text-[var(--text-muted)]">หมายเหตุ</dt>
                  <dd className="text-[var(--text)]">{order.customer_note}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-display text-lg font-bold text-[var(--text)]">
              ยอดชำระ
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">ยอดอาหาร</dt>
                <dd>{formatPrice(order.food_total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">ค่าจัดส่ง</dt>
                <dd>{formatPrice(order.delivery_fee)}</dd>
              </div>
              {deliveryMinimumSurcharge > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">
                    ส่วนต่างขั้นต่ำจัดส่ง
                  </dt>
                  <dd>{formatPrice(deliveryMinimumSurcharge)}</dd>
                </div>
              ) : null}
              {order.discount_total > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <dt>ส่วนลด</dt>
                  <dd>-{formatPrice(order.discount_total)}</dd>
                </div>
              ) : null}
              {(order.reward_discount ?? 0) > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <dt>แลกเครื่องดื่มฟรี</dt>
                  <dd>-{formatPrice(order.reward_discount ?? 0)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-[var(--border)] pt-2 font-display text-lg font-bold">
                <dt>ยอดชำระ</dt>
                <dd>{formatPrice(order.payable_total)}</dd>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <dt>ชำระด้วย</dt>
                <dd>{paymentMethodLabel(order.payment_method)}</dd>
              </div>
              {order.promo_code ? (
                <div className="flex justify-between text-[var(--text-muted)]">
                  <dt>โปรโมชั่น</dt>
                  <dd>{order.promo_code}</dd>
                </div>
              ) : null}
              {order.referrer_code ? (
                <div className="flex justify-between text-sky-700">
                  <dt>ผู้แนะนำ</dt>
                  <dd>
                    {referrerDisplayName ?? formatPhoneForDisplay(order.referrer_code)}{" "}
                    ({formatPhoneForDisplay(order.referrer_code)}) · +{REFERRAL_POINTS_PER_CUSTOMER} คะแนน
                  </dd>
                </div>
              ) : null}
            </dl>

            {order.payment_method === "transfer" ? (
              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  สลิปโอนเงิน
                </p>
                {order.payment_slip_url ? (
                  <div className="mt-3 space-y-3">
                    <a
                      href={order.payment_slip_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]"
                    >
                      <Image
                        src={order.payment_slip_url}
                        alt={`สลิปโอนเงินออเดอร์ ${order.order_number}`}
                        width={640}
                        height={960}
                        className="max-h-96 w-full object-contain"
                        unoptimized
                      />
                    </a>
                    <a
                      href={order.payment_slip_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
                    >
                      เปิดสลิปขนาดเต็ม
                    </a>
                  </div>
                ) : (
                  <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    ไม่มีสลิปแนบ (ออเดอร์เก่าก่อนเปิดระบบเก็บสลิป)
                  </p>
                )}
              </div>
            ) : null}
          </section>
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-display text-lg font-bold text-[var(--text)]">
            รายการสินค้า
          </h2>
          <ul className="mt-3 space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl bg-[var(--surface-muted)] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--text)]">
                      {item.product_name} × {item.quantity}
                    </p>
                    <ItemExtras item={item} />
                  </div>
                  <p className="font-semibold text-[var(--text)]">
                    {formatPrice(item.line_total)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function ItemExtras({ item }: { item: DbOrderItem }) {
  const options = item.options as { blended?: boolean; largeCup?: boolean };
  const toppings = item.toppings as { name?: string }[];
  const addons = item.addons as { name?: string }[];
  const parts: string[] = [];

  if (options.blended) parts.push("ปั่น");
  if (options.largeCup) parts.push("แก้วใหญ่");
  for (const topping of toppings) {
    if (topping.name) parts.push(topping.name);
  }
  for (const addon of addons) {
    if (addon.name) parts.push(addon.name);
  }

  if (parts.length === 0) return null;

  return (
    <p className="mt-1 text-xs text-[var(--text-muted)]">
      {parts.join(" · ")}
    </p>
  );
}
