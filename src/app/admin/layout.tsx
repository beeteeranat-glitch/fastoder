import { AdminOrderAlertsProvider } from "@/context/admin-order-alerts-context";
import { AdminShell } from "@/components/admin/admin-shell";
import { isAdminAuthenticated } from "@/lib/admin-session";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin-login");
  }
  return (
    <AdminOrderAlertsProvider>
      <AdminShell>{children}</AdminShell>
    </AdminOrderAlertsProvider>
  );
}
