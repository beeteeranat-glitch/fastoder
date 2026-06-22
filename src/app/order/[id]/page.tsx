import { OrderTracker } from "@/components/order/order-tracker";
import { PageContent, PageHeader, PageShell } from "@/components/layout/page-shell";

export default function OrderPage() {
  return (
    <PageShell>
      <PageHeader
        title="ติดตามออเดอร์"
        subtitle="ดูสถานะการทำเครื่องดื่มและจัดส่ง"
      />
      <PageContent className="flex flex-1 flex-col pb-24 lg:pb-8">
        <OrderTracker />
      </PageContent>
    </PageShell>
  );
}
