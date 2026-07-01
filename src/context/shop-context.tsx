"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_SHOP, type ShopProfile } from "@/lib/restaurant-data";
import { RESTAURANT_REALTIME_SUBS } from "@/lib/realtime-subscriptions";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";

type ShopContextValue = {
  shop: ShopProfile;
  loading: boolean;
  reload: () => Promise<void>;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<ShopProfile>(DEFAULT_SHOP);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/restaurant", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as ShopProfile;
      setShop(data);
    } catch {
      // ใช้ค่าเดิม
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (shop.isOpen || !shop.closingUntil) return;

    const delay = new Date(shop.closingUntil).getTime() - Date.now() + 1000;
    if (delay <= 0) {
      void reload();
      return;
    }

    const timer = window.setTimeout(() => void reload(), delay);
    return () => window.clearTimeout(timer);
  }, [shop.isOpen, shop.closingUntil, reload]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("fastorder-shop-updates");
    channel.onmessage = () => {
      void reload();
    };

    return () => channel.close();
  }, [reload]);

  useRealtimeRefetch(RESTAURANT_REALTIME_SUBS, () => void reload());

  const value = useMemo(
    () => ({ shop, loading, reload }),
    [shop, loading, reload],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within ShopProvider");
  }
  return context;
}
