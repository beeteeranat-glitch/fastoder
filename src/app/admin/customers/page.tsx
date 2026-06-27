import type { Metadata } from "next";
import { AdminCustomersBoard } from "@/components/admin/admin-customers-board";

export const metadata: Metadata = {
  title: "ลูกค้า | Admin FastOrder",
};

export default function AdminCustomersPage() {
  return <AdminCustomersBoard />;
}
