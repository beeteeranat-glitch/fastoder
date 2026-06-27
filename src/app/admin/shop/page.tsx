import type { Metadata } from "next";
import { AdminShopSettings } from "@/components/admin/admin-shop-settings";

export const metadata: Metadata = {
  title: "ข้อมูลร้าน | Admin FastOrder",
};

export default function AdminShopPage() {
  return <AdminShopSettings />;
}
