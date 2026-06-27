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
