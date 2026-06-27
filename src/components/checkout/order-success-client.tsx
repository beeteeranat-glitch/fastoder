"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/format";

export function OrderSuccessClient() {
  const router = useRouter();
  const params = useSearchParams();
  const orderNumber = params.get("orderNumber") ?? "";
  const total = Number(params.get("total") ?? "0");

  if (!orderNumber) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <p className="text-sm text-[var(--text-muted)]">ไม่พบเลขออเดอร์</p>
        <Link href="/menu" className="mt-4 inline-flex text-sm font-semibold text-[var(--primary)]">
          กลับหน้าเมนู
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-lg">
      <span className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-emerald-100 text-4xl">
        ✅
      </span>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
        สั่งซื้อสำเร็จ
      </p>
      <h1 className="font-display mt-1 text-2xl font-bold text-[var(--text)]">
        ยืนยันคำสั่งซื้อแล้ว
      </h1>

      <div className="mt-5 rounded-2xl bg-[var(--surface-muted)] px-4 py-4">
        <p className="text-xs font-semibold text-[var(--text-muted)]">เลขออเดอร์</p>
        <p className="font-display mt-1 text-3xl font-bold text-[var(--primary)]">
          #{orderNumber}
        </p>
        {total > 0 ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            ยอดชำระ {formatPrice(total)}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => router.push(`/orders/${orderNumber}`)}
        className="mt-5 w-full rounded-2xl bg-[var(--primary)] px-4 py-3.5 text-sm font-bold text-white"
      >
        ติดตามสถานะออเดอร์
      </button>
      <Link
        href="/menu"
        className="mt-2 inline-flex w-full items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold"
      >
        กลับหน้าเมนู
      </Link>
    </div>
  );
}
