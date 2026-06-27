"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderLookupForm() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = orderNumber.trim().replace(/^#/, "");
    if (!trimmed) {
      setError("กรุณากรอกเลขออเดอร์");
      return;
    }
    setError(null);
    router.push(`/orders/${encodeURIComponent(trimmed)}`);
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="font-display text-lg font-bold text-[var(--text)]">
        ค้นหาด้วยเลขออเดอร์
      </h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        กรอกเลขออเดอร์เพื่อดูสถานะล่าสุด
      </p>
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={orderNumber}
          onChange={(e) => {
            setOrderNumber(e.target.value);
            setError(null);
          }}
          placeholder="เช่น AB-1234"
          className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <button
          type="button"
          onClick={submit}
          className="shrink-0 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white"
        >
          ติดตาม
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>
      ) : null}
    </section>
  );
}
