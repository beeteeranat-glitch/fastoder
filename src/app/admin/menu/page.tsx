import type { Metadata } from "next";
import { AdminMenuEditor } from "@/components/admin/admin-menu-editor";

export const metadata: Metadata = {
  title: "จัดการเมนู | Admin FastOrder",
};

export default function AdminMenuPage() {
  return <AdminMenuEditor />;
}
