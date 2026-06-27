"use client";

import type { Product } from "@/types";
import { ProductCard } from "@/components/menu/product-card";

export function MenuHighlights({
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
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {emoji}
        </span>
        <h2 className="font-display text-lg font-bold text-[var(--text)]">
          {title}
        </h2>
      </div>
      <div className="flex flex-col gap-2.5">
        {products.map((product) => (
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
