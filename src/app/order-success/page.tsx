import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderSuccessClient } from "@/components/checkout/order-success-client";
import { PageContent, PageHeader, PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "สั่งซื้อสำเร็จ | FastOrder",
};

export default function OrderSuccessPage() {
  return (
    <PageShell>
      <PageHeader title="สั่งซื้อสำเร็จ" subtitle="บันทึกเลขออเดอร์ของคุณแล้ว" />
      <PageContent className="flex flex-1 items-center justify-center py-8">
        <Suspense fallback={<p className="text-sm text-[var(--text-muted)]">กำลังโหลด...</p>}>
          <OrderSuccessClient />
        </Suspense>
      </PageContent>
    </PageShell>
  );
}
