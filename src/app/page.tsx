import Link from "next/link";
import { RESTAURANT } from "@/data/menu";
import { DELIVERY_MAX_KM } from "@/lib/delivery-fee";
import { PageShell } from "@/components/layout/page-shell";

export default function HomePage() {
  return (
    <PageShell>
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at top right, var(--hero-to), transparent 45%), radial-gradient(circle at bottom left, var(--hero-from), transparent 50%)",
          }}
        />

        <div className="relative flex flex-1 flex-col justify-between px-5 py-8 sm:px-8 sm:py-10 lg:grid lg:min-h-dvh lg:grid-cols-2 lg:items-center lg:gap-10 lg:px-12 lg:py-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--primary)]">
              QR Ordering
            </p>
            <h1 className="font-display mt-3 text-3xl font-bold leading-tight text-[var(--text)] sm:text-4xl lg:text-5xl">
              สแกน QR
              <br />
              สั่งเครื่องดื่มได้ทันที
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--text-muted)] lg:text-lg">
              ไม่ต้องติดตั้งแอป เลือกเมนู เพิ่มท็อปปิ้ง แชร์ตำแหน่ง
              และสั่งได้ทันที
            </p>
          </div>

          <div className="mt-8 space-y-4 lg:mt-0">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 p-5 shadow-lg backdrop-blur sm:p-6">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--primary)] bg-[var(--primary)]/5 text-3xl sm:h-24 sm:w-24 sm:text-4xl">
                  ▦
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)] sm:text-base">
                    {RESTAURANT.name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">
                    จัดส่ง 1–{DELIVERY_MAX_KM} กม. ค่าส่งตามระยะทาง
                  </p>
                  <p className="mt-2 inline-flex rounded-full bg-[var(--secondary)]/15 px-2.5 py-1 text-[11px] font-semibold text-[var(--secondary)]">
                    สแกนแล้ว — พร้อมสั่ง
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/menu"
              className="btn-primary flex w-full items-center justify-center px-5 py-4 text-base sm:text-lg"
            >
              เข้าสู่เมนูร้าน
            </Link>

            <p className="text-center text-xs text-[var(--text-muted)]">
              UI ตัวอย่าง — ยังไม่เชื่อมฐานข้อมูล
            </p>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
