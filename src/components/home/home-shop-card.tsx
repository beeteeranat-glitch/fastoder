"use client";

import Link from "next/link";
import { useShop } from "@/context/shop-context";
import { ShopLogo } from "@/components/shop/shop-logo";
import { formatDeliveryRange } from "@/lib/delivery-fee";

export function HomeShopCard() {
  const { shop } = useShop();

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 p-5 shadow-lg backdrop-blur sm:p-6">
      <div className="flex items-center gap-4 sm:gap-5">
        <ShopLogo name={shop.name} logoUrl={shop.logoUrl} size="md" />
        <div>
          <p className="text-sm font-semibold text-[var(--text)] sm:text-base">
            {shop.name}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)] sm:text-sm">
            {shop.address}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            จัดส่ง {formatDeliveryRange()} ค่าส่งตามระยะทาง
          </p>
          <p className="mt-2 inline-flex rounded-full bg-[var(--secondary)]/15 px-2.5 py-1 text-[11px] font-semibold text-[var(--secondary)]">
            สแกนแล้ว — พร้อมสั่ง
          </p>
        </div>
      </div>
    </div>
  );
}

export function HomeShopCta() {
  return (
    <Link
      href="/menu"
      className="btn-primary flex w-full items-center justify-center px-5 py-4 text-base sm:text-lg"
    >
      เข้าสู่เมนูร้าน
    </Link>
  );
}
