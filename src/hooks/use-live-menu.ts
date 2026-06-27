"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ADDONS, CATEGORIES, PRODUCTS, RESTAURANT, TOPPINGS } from "@/data/menu";
import { getBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { MenuData } from "@/lib/menu-data";
import { menuBroadcastChannel } from "@/lib/menu-broadcast-channel";
import { MENU_REALTIME_TABLES } from "@/lib/realtime-subscriptions";

const STATIC_MENU: MenuData = {
  categories: CATEGORIES,
  products: PRODUCTS,
  toppings: TOPPINGS,
  addons: ADDONS,
};

const RELOAD_DEBOUNCE_MS = 250;
const POLL_INTERVAL_MS = 5000;

type UseLiveMenuOptions = {
  endpoint?: string;
};

export function useLiveMenu({ endpoint = "/api/menu" }: UseLiveMenuOptions = {}) {
  const [menu, setMenu] = useState<MenuData>(STATIC_MENU);
  const loadMenuRef = useRef<() => Promise<void>>(async () => {});

  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch(`${endpoint}?_=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<MenuData>;
      setMenu({
        categories: data.categories ?? STATIC_MENU.categories,
        products: data.products ?? STATIC_MENU.products,
        toppings: data.toppings ?? STATIC_MENU.toppings,
        addons: data.addons ?? STATIC_MENU.addons,
      });
    } catch {
      // คงข้อมูลเดิมถ้าโหลดไม่สำเร็จ
    }
  }, [endpoint]);

  loadMenuRef.current = loadMenu;

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      const poll = setInterval(() => void loadMenuRef.current(), POLL_INTERVAL_MS);
      return () => clearInterval(poll);
    }

    const supabase = getBrowserClient();
    if (!supabase) {
      const poll = setInterval(() => void loadMenuRef.current(), POLL_INTERVAL_MS);
      return () => clearInterval(poll);
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void loadMenuRef.current();
      }, RELOAD_DEBOUNCE_MS);
    };

    const filter = `restaurant_id=eq.${RESTAURANT.id}`;
    let channel = supabase
      .channel(menuBroadcastChannel())
      .on("broadcast", { event: "updated" }, scheduleReload);

    for (const table of MENU_REALTIME_TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        scheduleReload,
      );
    }

    channel.subscribe();

    const poll = setInterval(() => void loadMenuRef.current(), POLL_INTERVAL_MS);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, []);

  return { ...menu, reload: loadMenu };
}
