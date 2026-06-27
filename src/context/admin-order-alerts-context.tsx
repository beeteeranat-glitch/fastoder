"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type ReactNode,
} from "react";
import { AdminOrderAlertOverlay } from "@/components/admin/admin-order-alert-overlay";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import {
  startOrderAlertLoop,
  stopOrderAlertLoop,
  unlockOrderAlertAudio,
} from "@/lib/order-alert-sound";
import { ORDERS_REALTIME_SUBS } from "@/lib/realtime-subscriptions";
import { getBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { RESTAURANT } from "@/data/menu";

export type OrderAlert = {
  id: string;
  orderNumber: string;
  customerName: string;
  payableTotal: number;
  createdAt: string;
};

type InsertedOrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  payable_total: number;
  status: string;
  created_at: string;
};

type AdminOrderAlertsContextValue = {
  pendingCount: number;
  audioEnabled: boolean;
  enableAudio: () => void;
  activeAlerts: OrderAlert[];
  dismissAlert: (id: string) => void;
  dismissAllAlerts: () => void;
};

const AdminOrderAlertsContext =
  createContext<AdminOrderAlertsContextValue | null>(null);

const POLL_MS = 5_000;
const AUDIO_PREF_KEY = "fastorder-admin-audio-enabled";

function readAudioPref(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUDIO_PREF_KEY) === "1";
}

function writeAudioPref(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_PREF_KEY, enabled ? "1" : "0");
}

function mapInsertedOrder(row: InsertedOrderRow): OrderAlert {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    payableTotal: row.payable_total,
    createdAt: row.created_at,
  };
}

export function AdminOrderAlertsProvider({ children }: { children: ReactNode }) {
  const channelId = useId().replace(/:/g, "");
  const [pendingCount, setPendingCount] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<OrderAlert[]>([]);
  const audioEnabledRef = useRef(false);
  const knownPendingOrderIdsRef = useRef<Set<string>>(new Set());
  const hasSeededPendingOrdersRef = useRef(false);

  audioEnabledRef.current = audioEnabled;

  const pushAlert = useCallback((alert: OrderAlert) => {
    setActiveAlerts((current) => {
      if (current.some((item) => item.id === alert.id)) return current;
      return [...current, alert];
    });
  }, []);

  const notifyNewOrder = useCallback((alert: OrderAlert) => {
    pushAlert(alert);
    if (audioEnabledRef.current) {
      startOrderAlertLoop();
    }
  }, [pushAlert]);

  const refreshPendingCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders?status=PENDING&limit=1", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        orders?: InsertedOrderRow[];
        total?: number;
      };
      const orders = data.orders ?? [];
      setPendingCount(data.total ?? orders.length);

      if (!hasSeededPendingOrdersRef.current) {
        for (const order of orders) {
          knownPendingOrderIdsRef.current.add(order.id);
        }
        hasSeededPendingOrdersRef.current = true;
        return;
      }

      for (const order of orders) {
        if (knownPendingOrderIdsRef.current.has(order.id)) continue;
        knownPendingOrderIdsRef.current.add(order.id);
        notifyNewOrder(mapInsertedOrder(order));
      }
    } catch {
      // เงียบ — รอบถัดไปจะลองใหม่
    }
  }, [notifyNewOrder]);

  const dismissAlert = useCallback((id: string) => {
    setActiveAlerts((current) => current.filter((alert) => alert.id !== id));
  }, []);

  const dismissAllAlerts = useCallback(() => {
    setActiveAlerts([]);
  }, []);

  const enableAudio = useCallback(() => {
    unlockOrderAlertAudio();
    writeAudioPref(true);
    setAudioEnabled(true);
  }, []);

  useEffect(() => {
    if (!readAudioPref()) return;
    unlockOrderAlertAudio();
    setAudioEnabled(true);
  }, []);

  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount]);

  useRealtimeRefetch(ORDERS_REALTIME_SUBS, refreshPendingCount);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshPendingCount();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshPendingCount]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`admin:new-orders:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${RESTAURANT.id}`,
        },
        (payload) => {
          const row = payload.new as InsertedOrderRow;
          if (!row?.id || row.status !== "PENDING") return;

          knownPendingOrderIdsRef.current.add(row.id);
          notifyNewOrder(mapInsertedOrder(row));
          void refreshPendingCount();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelId, notifyNewOrder, refreshPendingCount]);

  useEffect(() => {
    if (activeAlerts.length === 0) {
      stopOrderAlertLoop();
    }
  }, [activeAlerts.length]);

  useEffect(() => {
    return () => stopOrderAlertLoop();
  }, []);

  useEffect(() => {
    const unlock = () => enableAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [enableAudio]);

  const value = useMemo(
    () => ({
      pendingCount,
      audioEnabled,
      enableAudio,
      activeAlerts,
      dismissAlert,
      dismissAllAlerts,
    }),
    [
      pendingCount,
      audioEnabled,
      enableAudio,
      activeAlerts,
      dismissAlert,
      dismissAllAlerts,
    ],
  );

  return (
    <AdminOrderAlertsContext.Provider value={value}>
      {children}
      <AdminOrderAlertOverlay
        alerts={activeAlerts}
        audioEnabled={audioEnabled}
        onEnableAudio={enableAudio}
        onDismiss={dismissAlert}
        onDismissAll={dismissAllAlerts}
      />
    </AdminOrderAlertsContext.Provider>
  );
}

export function useAdminOrderAlerts() {
  const context = useContext(AdminOrderAlertsContext);
  if (!context) {
    throw new Error(
      "useAdminOrderAlerts must be used within AdminOrderAlertsProvider",
    );
  }
  return context;
}
