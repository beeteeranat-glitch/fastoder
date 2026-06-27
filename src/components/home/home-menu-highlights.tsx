"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/menu/product-card";
import { ProductSheet } from "@/components/product/product-sheet";
import { useLiveMenu } from "@/hooks/use-live-menu";
import { pickMenuHighlights, type BestSellerItem } from "@/lib/best-sellers";
import type { Product } from "@/types";

function HighlightSection({
  title,
  emoji,
  products,
  onSelect,
}: {
  title: string;
  emoji: string;
  products: Product[];
  onSelect: (product: Product) => void;
}) {
  if (products.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-4 backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg" aria-hidden>
          {emoji}
        </span>
        <h2 className="font-display text-base font-bold text-[var(--text)]">
          {title}
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        {products.slice(0, 3).map((product) => (
          <ProductCard
            key={`${title}-${product.id}`}
            product={product}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

export function HomeMenuHighlights() {
  const { products, toppings, addons } = useLiveMenu();
  const [bestSellers, setBestSellers] = useState<BestSellerItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    void fetch("/api/menu/best-sellers", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { bestSellers?: BestSellerItem[] }) => {
        setBestSellers(data.bestSellers ?? []);
      })
      .catch(() => {});
  }, []);

  const highlights = useMemo(
    () => pickMenuHighlights(products, bestSellers),
    [products, bestSellers],
  );

  const hasHighlights =
    highlights.bestSellers.length > 0 ||
    highlights.recommended.length > 0 ||
    highlights.newest.length > 0;

  if (!hasHighlights) return null;

  return (
    <>
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-sm font-semibold text-[var(--text)]">เมนูแนะนำจากร้าน</p>
          <Link href="/menu" className="text-xs font-semibold text-[var(--primary)]">
            ดูเมนูทั้งหมด →
          </Link>
        </div>
        <HighlightSection
          title="เมนูขายดี"
          emoji="🔥"
          products={highlights.bestSellers}
          onSelect={setSelectedProduct}
        />
        <HighlightSection
          title="เมนูแนะนำ"
          emoji="⭐"
          products={highlights.recommended}
          onSelect={setSelectedProduct}
        />
        <HighlightSection
          title="เมนูใหม่"
          emoji="🆕"
          products={highlights.newest}
          onSelect={setSelectedProduct}
        />
      </div>

      <ProductSheet
        product={selectedProduct}
        toppings={toppings}
        addons={addons}
        onClose={() => setSelectedProduct(null)}
      />
    </>
  );
}
