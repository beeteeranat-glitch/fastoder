"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { formatOrderDate } from "@/lib/orders";
import type { OrderAlert } from "@/context/admin-order-alerts-context";

export function AdminOrderAlertOverlay({
  alerts,
  audioEnabled,
  onEnableAudio,
  onDismiss,
  onDismissAll,
}: {
  alerts: OrderAlert[];
  audioEnabled: boolean;
  onEnableAudio: () => void;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}) {
  if (alerts.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="order-alert-title"
    >
      <div className="w-full max-w-md rounded-3xl border-4 border-rose-400 bg-[var(--surface)] p-6 shadow-2xl shadow-rose-500/30">
        <div className="flex items-start gap-3">
          <span
            className="flex h-14 w-14 shrink-0 animate-pulse items-center justify-center rounded-2xl bg-rose-500 text-3xl text-white shadow-lg shadow-rose-500/40"
            aria-hidden
          >
            🔔
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-600">
              แจ้งเตือน
            </p>
            <h2
              id="order-alert-title"
              className="font-display text-2xl font-bold text-[var(--text)]"
            >
              มีออเดอร์ใหม่!
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {alerts.length === 1
                ? "มีลูกค้าสั่งเข้ามา กรุณาตรวจสอบ"
                : `มีออเดอร์ใหม่ ${alerts.length} รายการ`}
            </p>
          </div>
        </div>

        <ul className="mt-5 max-h-56 space-y-2 overflow-y-auto">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-[var(--text)]">
                    #{alert.orderNumber}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--text)]">
                    {alert.customerName}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {formatOrderDate(alert.createdAt)} ·{" "}
                    {formatPrice(alert.payableTotal)}
                  </p>
                </div>
                <Link
                  href={`/admin/orders/${alert.id}`}
                  onClick={() => onDismiss(alert.id)}
                  className="shrink-0 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-bold text-white"
                >
                  ดู
                </Link>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link
            href="/admin/orders"
            onClick={onDismissAll}
            className="flex items-center justify-center rounded-2xl bg-[var(--primary)] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--primary)]/30"
          >
            ไปหน้าออเดอร์
          </Link>
          {!audioEnabled ? (
            <button
              type="button"
              onClick={onEnableAudio}
              className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3.5 text-sm font-bold text-amber-800"
            >
              เปิดเสียง
            </button>
          ) : (
            <button
              type="button"
              onClick={onDismissAll}
              className="rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3.5 text-sm font-bold text-[var(--text)]"
            >
              ปิดการแจ้งเตือน
            </button>
          )}
        </div>

        {!audioEnabled ? (
          <button
            type="button"
            onClick={onDismissAll}
            className="mt-2 w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-bold text-[var(--text)]"
          >
            ปิดการแจ้งเตือน (ไม่เปิดเสียง)
          </button>
        ) : null}

        <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
          {audioEnabled
            ? "เสียงจะเล่นเมื่อมีออเดอร์ใหม่ และหยุดเมื่อกดปิดการแจ้งเตือน"
            : "กดเปิดเสียงก่อน — เสียงจะเล่นเมื่อมีออเดอร์ใหม่เข้ามา"}
        </p>
      </div>
    </div>
  );
}
