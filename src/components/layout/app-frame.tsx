import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CartSummaryBar } from "@/components/cart/cart-summary-bar";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-frame mx-auto flex h-dvh max-h-dvh w-full max-w-lg flex-col overflow-hidden bg-[var(--surface-muted)] sm:max-w-xl md:max-w-2xl lg:my-4 lg:h-auto lg:max-h-[calc(100dvh-2rem)] lg:max-w-6xl lg:flex-row lg:overflow-hidden lg:rounded-[2rem] lg:border lg:border-[var(--border)] lg:shadow-[0_24px_80px_-24px_rgb(var(--shadow-color)/0.35)]">
      <aside className="hidden shrink-0 bg-[var(--surface)] lg:flex lg:w-60 lg:flex-col lg:px-5 lg:py-7">
        <div className="rounded-2xl bg-gradient-to-br from-[var(--primary-soft)] to-[var(--secondary-soft)] p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface)] text-xl shadow-sm">
            🧋
          </div>
          <p className="font-display mt-3 text-lg font-bold text-[var(--text)]">
            FastOrder
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            สั่งเครื่องดื่มออนไลน์
          </p>
        </div>
        <div className="mt-6 flex flex-1 flex-col gap-1">
          <BottomNav variant="sidebar" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          {children}
        </div>

        <div className="z-40 shrink-0 border-t border-[var(--border)] bg-[var(--surface-muted)] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)] lg:hidden">
          <CartSummaryBar />
          <BottomNav variant="bottom" />
        </div>
      </div>
    </div>
  );
}
