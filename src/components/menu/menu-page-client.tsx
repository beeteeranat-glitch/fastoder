"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, PRODUCTS } from "@/data/menu";
import { CategoryTabs } from "@/components/menu/category-tabs";
import { MenuShopHeader } from "@/components/menu/menu-shop-header";
import { ProductCard } from "@/components/menu/product-card";
import { ProductSheet } from "@/components/product/product-sheet";
import { PageContent } from "@/components/layout/page-shell";
import type { Product } from "@/types";

export function MenuPageClient() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const activeCategoryData = useMemo(
    () => CATEGORIES.find((category) => category.id === activeCategory),
    [activeCategory],
  );

  const products = useMemo(
    () => PRODUCTS.filter((product) => product.categoryId === activeCategory),
    [activeCategory],
  );

  return (
    <>
      <MenuShopHeader
        tabs={
          <CategoryTabs
            categories={CATEGORIES}
            activeId={activeCategory}
            onChange={setActiveCategory}
          />
        }
      />

      <PageContent className="flex min-w-0 flex-1 flex-col pb-6 lg:pb-8">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col py-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                รายการในเมนู
              </p>
              <h2 className="font-display mt-1 text-xl font-bold text-[var(--text)]">
                {activeCategoryData?.emoji} {activeCategoryData?.name}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {activeCategoryData?.description}
              </p>
            </div>
            <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)] ring-1 ring-[var(--border)]">
              {products.length} รายการ
            </span>
          </div>

          <div className="flex flex-col gap-2.5 sm:gap-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={setSelectedProduct}
              />
            ))}
          </div>
        </div>
      </PageContent>

      <ProductSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </>
  );
}
