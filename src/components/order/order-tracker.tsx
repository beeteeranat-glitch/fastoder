"use client";

import { useEffect, useState } from "react";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STEPS,
} from "@/data/menu";
import type { OrderStatus } from "@/types";

const DEMO_SEQUENCE: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_DELIVERY",
  "DELIVERING",
  "COMPLETED",
];

export function OrderTracker() {
  const [statusIndex, setStatusIndex] = useState(0);
  const status = DEMO_SEQUENCE[statusIndex];

  useEffect(() => {
    if (statusIndex >= DEMO_SEQUENCE.length - 1) return;
    const timer = setTimeout(() => {
      setStatusIndex((current) =>
        Math.min(current + 1, DEMO_SEQUENCE.length - 1),
      );
    }, 2800);
    return () => clearTimeout(timer);
  }, [statusIndex]);

  const currentStepIndex = ORDER_STATUS_STEPS.indexOf(
    status as (typeof ORDER_STATUS_STEPS)[number],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 lg:grid lg:grid-cols-2 lg:gap-6">
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
              ออเดอร์ #FO-240622
            </p>
            <h2 className="font-display mt-1 text-2xl font-bold text-[var(--text)]">
              {ORDER_STATUS_LABELS[status]}
            </h2>
          </div>
          <div className="text-4xl">
            {status === "COMPLETED"
              ? "✅"
              : status === "DELIVERING"
                ? "🛵"
                : status === "PREPARING"
                  ? "🧋"
                  : "⏳"}
          </div>
        </div>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          ตัวอย่างการติดตามสถานะ — ระบบจะอัปเดตอัตโนมัติเมื่อเชื่อม backend
        </p>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="font-display text-lg font-bold text-[var(--text)]">
          ขั้นตอนการจัดส่ง
        </h3>
        <ol className="mt-4 space-y-4">
          {ORDER_STATUS_STEPS.map((step, index) => {
            const done = index <= currentStepIndex;
            const active = index === currentStepIndex;
            return (
              <li key={step} className="flex gap-3">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-[var(--primary)] text-white"
                      : "border border-[var(--border)] text-[var(--text-muted)]"
                  } ${active ? "ring-4 ring-[var(--primary)]/20" : ""}`}
                >
                  {index + 1}
                </div>
                <div>
                  <p
                    className={`font-semibold ${
                      done ? "text-[var(--text)]" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {ORDER_STATUS_LABELS[step]}
                  </p>
                  {active ? (
                    <p className="mt-0.5 text-xs text-[var(--primary)]">
                      กำลังดำเนินการ...
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-5 text-sm text-[var(--text-muted)]">
        <p className="font-semibold text-[var(--text)]">สถานะยกเลิก (ตัวอย่าง)</p>
        <p className="mt-2">
          PENDING → CANCELLED หรือ CONFIRMED → CANCELLED
        </p>
      </section>
    </div>
  );
}
