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
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import { customerProfileRealtimeSubs } from "@/lib/realtime-subscriptions";

export type CustomerProfile = {
  id: string;
  phone: string;
  phoneDisplay?: string;
  name: string;
  defaultAddress?: string | null;
  points: number;
  orderCount: number;
  totalSpent: number;
};

type CustomerAuthContextValue = {
  customer: CustomerProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = (await res.json()) as {
        authenticated?: boolean;
        customer?: CustomerProfile;
      };
      setCustomer(data.authenticated && data.customer ? data.customer : null);
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const profileRealtimeSubs = useMemo(
    () => (customer ? customerProfileRealtimeSubs(customer.id) : []),
    [customer?.id],
  );
  useRealtimeRefetch(profileRealtimeSubs, refresh, Boolean(customer?.id));

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCustomer(null);
  }, []);

  const value = useMemo(
    () => ({ customer, loading, refresh, logout }),
    [customer, loading, refresh, logout],
  );

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  }
  return context;
}
