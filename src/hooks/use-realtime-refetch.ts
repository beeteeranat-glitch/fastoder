"use client";

import { useEffect, useId, useRef } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type RealtimeTableSubscription = {
  table: string;
  /** เช่น `restaurant_id=eq.demo-shop` หรือ `id=eq.uuid` */
  filter?: string;
};

const REFETCH_DEBOUNCE_MS = 300;

export function useRealtimeRefetch(
  subscriptions: RealtimeTableSubscription[],
  onRefetch: () => void,
  enabled = true,
) {
  const onRefetchRef = useRef(onRefetch);
  onRefetchRef.current = onRefetch;

  const instanceId = useId().replace(/:/g, "");
  const subsKey = JSON.stringify(subscriptions);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;

    const supabase = getBrowserClient();
    if (!supabase) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onRefetchRef.current();
      }, REFETCH_DEBOUNCE_MS);
    };

    const channels = subscriptions.map((sub, index) =>
      supabase
        .channel(
          `rt:${instanceId}:${sub.table}:${index}:${sub.filter ?? "all"}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: sub.table,
            ...(sub.filter ? { filter: sub.filter } : {}),
          },
          scheduleRefetch,
        )
        .subscribe(),
    );

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      for (const channel of channels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [instanceId, subsKey, enabled]);
}
