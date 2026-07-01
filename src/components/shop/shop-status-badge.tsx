"use client";

import { useEffect, useMemo, useState } from "react";
import type { ShopProfile } from "@/lib/restaurant-data";

type ShopStatusBadgeProps = {
  shop: ShopProfile;
  compact?: boolean;
};

function useCurrentTime(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;

    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [enabled]);

  return now;
}

export function ShopStatusBadge({ shop, compact = false }: ShopStatusBadgeProps) {
  const closingUntilTime = useMemo(
    () => (shop.closingUntil ? new Date(shop.closingUntil).getTime() : null),
    [shop.closingUntil],
  );
  const now = useCurrentTime(!shop.isOpen && closingUntilTime !== null);
  const remainingMinutes =
    closingUntilTime !== null
      ? Math.max(0, Math.ceil((closingUntilTime - now) / 60000))
      : null;

  const dotSize = compact ? "h-1.5 w-1.5" : "h-2.5 w-2.5";
  const text = shop.isOpen
    ? compact
      ? "เปิดรับออเดอร์"
      : "ร้านเปิดรับออเดอร์"
    : remainingMinutes !== null && remainingMinutes > 0
      ? `ปิดรับออเดอร์อีก ${remainingMinutes} นาที`
      : compact
        ? "ปิดรับออเดอร์"
        : "ร้านปิดรับออเดอร์";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition-colors ${
        shop.isOpen
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-rose-50 text-rose-700 ring-rose-200"
      }`}
    >
      <span
        className={`${dotSize} rounded-full transition-colors ${
          shop.isOpen ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
      {text}
    </span>
  );
}
