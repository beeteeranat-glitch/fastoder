import type { Metadata } from "next";
import { OrderTracking } from "@/components/customer/order-tracking";
import { PageContent, PageHeader, PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "ติดตามออเดอร์ | FastOrder",
};

type PageProps = {
  params: Promise<{ orderNumber: string }>;
};

export default async function OrderDetailPage({ params }: PageProps) {
  const { orderNumber } = await params;

  return (
    <PageShell>
      <PageHeader
        title="ติดตามออเดอร์"
        subtitle={`#${orderNumber}`}
      />
      <PageContent className="flex flex-1 flex-col pb-24 lg:pb-8">
        <OrderTracking orderNumber={orderNumber} />
      </PageContent>
    </PageShell>
  );
}
