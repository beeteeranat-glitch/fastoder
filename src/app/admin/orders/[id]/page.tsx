import type { Metadata } from "next";
import { AdminOrderDetail } from "@/components/admin/admin-order-detail";

export const metadata: Metadata = {
  title: "รายละเอียดออเดอร์ | Admin FastOrder",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <AdminOrderDetail orderId={id} />;
}
