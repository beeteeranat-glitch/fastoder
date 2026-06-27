import type { Metadata } from "next";
import { AdminRewardsBoard } from "@/components/admin/admin-rewards-board";

export const metadata: Metadata = {
  title: "รางวัล | Admin FastOrder",
};

export default function AdminRewardsPage() {
  return <AdminRewardsBoard />;
}
