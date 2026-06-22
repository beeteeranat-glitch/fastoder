import { CartView } from "@/components/cart/cart-view";
import { PageContent, PageHeader, PageShell } from "@/components/layout/page-shell";

export default function CartPage() {
  return (
    <PageShell>
      <PageHeader title="ตะกร้าสินค้า" subtitle="ตรวจสอบรายการก่อนสั่งซื้อ" />
      <PageContent className="flex flex-1 flex-col pb-24 lg:pb-8">
        <CartView />
      </PageContent>
    </PageShell>
  );
}
