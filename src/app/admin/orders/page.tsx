import type { Metadata } from "next";
import { AdminOrdersBoard } from "@/components/admin/admin-orders-board";

export const metadata: Metadata = {
  title: "ออเดอร์ | Admin FastOrder",
};

export default function AdminOrdersPage() {
  return <AdminOrdersBoard />;
}
