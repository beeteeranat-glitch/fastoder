"use client";

import { formatDeliveryRange } from "@/lib/delivery-fee";
import type { ReactNode } from "react";
import { useShop } from "@/context/shop-context";
import { ShopLogo } from "@/components/shop/shop-logo";

export function MenuShopHeader({ tabs }: { tabs: ReactNode }) {
  const { shop } = useShop();

  return (
    <header className="glass-panel sticky top-0 z-30 border-b border-[var(--border)]">
      <div className="h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--primary)]" />

      <div className="bg-[var(--surface)] px-4 pb-4 pt-4 sm:px-5 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-start gap-3">
          <ShopLogo name={shop.name} logoUrl={shop.logoUrl} size="sm" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
              FastOrder
            </p>
            <h1 className="font-display mt-0.5 truncate text-xl font-bold text-[var(--text)] sm:text-2xl">
              {shop.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                เปิดรับออเดอร์
              </span>
              <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] ring-1 ring-[var(--border)]">
                จัดส่ง {formatDeliveryRange()}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-2.5 ring-1 ring-[var(--border)]">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            เลือกหมวดเมนู
          </p>
          {tabs}
          <p className="mt-2 px-1 text-center text-[11px] text-[var(--text-muted)] sm:hidden">
            แตะหมวดเมนู หรือปัดซ้าย–ขวา
          </p>
        </div>
      </div>
    </header>
  );
}
