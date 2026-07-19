import { RiderOrderDetail } from "@/components/rider/rider-order-detail";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function RiderOrderPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  return <RiderOrderDetail orderId={id} returnToAdmin={from === "admin"} />;
}
