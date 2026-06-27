import type { Metadata } from "next";
import { fetchBestSellers } from "@/lib/best-sellers";

export const metadata: Metadata = {
  title: "เมนูขายดี | Admin FastOrder",
};

export default async function AdminBestSellersPage() {
  const bestSellers = await fetchBestSellers(20);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        จากออเดอร์ที่มีสถานะ COMPLETED
      </p>

      {bestSellers.length === 0 ? (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--text-muted)]">
          ยังไม่มีข้อมูล
        </p>
      ) : (
        <ol className="space-y-2">
          {bestSellers.map((item, index) => (
            <li
              key={item.productId}
              className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary)]">
                  {index + 1}
                </span>
                <span className="font-semibold">{item.productName}</span>
              </div>
              <span className="text-sm font-semibold text-[var(--text-muted)]">
                {item.quantitySold} แก้ว
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
