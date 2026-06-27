import type { Metadata } from "next";
import { AdminReferrersBoard } from "@/components/admin/admin-referrers-board";

export const metadata: Metadata = {
  title: "ผู้แนะนำ | Admin FastOrder",
};

export default function AdminReferrersPage() {
  return <AdminReferrersBoard />;
}
