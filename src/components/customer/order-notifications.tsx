"use client";

import { useEffect, useRef } from "react";
import type { DbOrderStatus } from "@/types/database";
import { ORDER_STATUS_LABELS } from "@/lib/orders";

export function useOrderStatusNotifications(
  orderNumber: string,
  status: DbOrderStatus | null,
) {
  const previousStatus = useRef<DbOrderStatus | null>(null);

  useEffect(() => {
    if (!status || typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (previousStatus.current === status) return;

    const isFirstLoad = previousStatus.current === null;
    previousStatus.current = status;
    if (isFirstLoad) return;

    const label = ORDER_STATUS_LABELS[status];
    const tag = `order-${orderNumber}-${status}`;

    try {
      new Notification(`ออเดอร์ #${orderNumber}`, {
        body: label,
        tag,
      });
    } catch {
      // ignore notification errors
    }
  }, [orderNumber, status]);
}

export function PushNotificationPrompt() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;

    void Notification.requestPermission();
  }, []);

  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (Notification.permission !== "default") return null;

  return (
    <button
      type="button"
      onClick={() => void Notification.requestPermission()}
      className="w-full rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800"
    >
      🔔 เปิดการแจ้งเตือนสถานะออเดอร์
    </button>
  );
}
