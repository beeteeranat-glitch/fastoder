import { AdminOrderAlertsProvider } from "@/context/admin-order-alerts-context";
import { AdminShell } from "@/components/admin/admin-shell";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminOrderAlertsProvider>
      <AdminShell>{children}</AdminShell>
    </AdminOrderAlertsProvider>
  );
}
