"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/cart-context";
import { calcCartTotal, formatPrice } from "@/lib/format";

export function CartSummaryBar() {
  const { items, itemCount } = useCart();
  const pathname = usePathname();
  const total = calcCartTotal(items);

  if (itemCount === 0 || pathname !== "/menu") return null;

  return (
    <Link
      href="/cart"
      className="flex w-full items-center justify-between gap-4 bg-gradient-to-r from-[var(--secondary)] to-[color-mix(in_srgb,var(--secondary)_88%,var(--primary))] px-5 py-4 text-white shadow-[0_-4px_20px_-8px_rgb(var(--shadow-color)/0.35)] active:brightness-95"
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
          <span className="text-lg">🛒</span>
          <span>{itemCount} รายการ</span>
        </p>
        <p className="mt-0.5 text-xs text-white/75">แตะเพื่อดูตะกร้า</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium text-white/80">ยอดรวม</p>
        <p className="font-display text-2xl font-bold leading-tight">
          {formatPrice(total)}
        </p>
      </div>
    </Link>
  );
}
