import type { Metadata } from "next";
import { AdminPromosBoard } from "@/components/admin/admin-promos-board";

export const metadata: Metadata = {
  title: "โค้ดลด | Admin FastOrder",
};

export default function AdminPromosPage() {
  return <AdminPromosBoard />;
}
