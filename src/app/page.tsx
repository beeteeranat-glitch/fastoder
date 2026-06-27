import { PageShell } from "@/components/layout/page-shell";
import { HomeMenuHighlights } from "@/components/home/home-menu-highlights";
import { HomeShopCard, HomeShopCta } from "@/components/home/home-shop-card";

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
            <HomeShopCard />
            <HomeShopCta />
          </div>
        </div>
      </main>
    </PageShell>
  );
}
