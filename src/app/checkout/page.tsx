import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { PageContent, PageHeader, PageShell } from "@/components/layout/page-shell";

export default function CheckoutPage() {
  return (
    <PageShell>
      <PageHeader
        title="ยืนยันคำสั่งซื้อ"
        subtitle="กรอกข้อมูลและแชร์ตำแหน่งจัดส่ง"
      />
      <PageContent className="flex flex-1 flex-col pb-24 lg:pb-8">
        <CheckoutFlow />
      </PageContent>
    </PageShell>
  );
}
