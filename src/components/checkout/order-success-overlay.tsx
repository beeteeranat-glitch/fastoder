"use client";

import { formatPrice } from "@/lib/format";

export function OrderSuccessOverlay({
  orderNumber,
  payableTotal,
  onTrack,
  onClose,
}: {
  orderNumber: string;
  payableTotal: number;
  onTrack?: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-success-title"
    >
      <div className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-4xl"
            aria-hidden
          >
            ✅
          </span>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
            สั่งซื้อสำเร็จ
          </p>
          <h2
            id="order-success-title"
            className="font-display mt-1 text-2xl font-bold text-[var(--text)]"
          >
            รับออเดอร์แล้ว
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            ร้านจะตรวจสอบและยืนยันออเดอร์ของคุณเร็ว ๆ นี้
          </p>
        </div>

        <div className="mt-5 rounded-2xl bg-[var(--surface-muted)] px-4 py-4 text-center">
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            เลขออเดอร์
          </p>
          <p className="font-display mt-1 text-3xl font-bold tracking-wide text-[var(--primary)]">
            #{orderNumber}
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            ยอดชำระ {formatPrice(payableTotal)}
          </p>
        </div>

        {onTrack ? (
          <button
            type="button"
            onClick={onTrack}
            className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[var(--primary)] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--primary)]/30"
          >
            ติดตามสถานะออเดอร์
          </button>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className={`flex w-full items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3.5 text-sm font-bold text-[var(--text)] ${onTrack ? "mt-2" : "mt-5"}`}
        >
          กลับไปหน้าเมนู
        </button>
      </div>
    </div>
  );
}
