"use client";

import { useEffect, useMemo, useState } from "react";
import { MenuHighlights } from "@/components/menu/menu-highlights";
import {
  ALL_MENU_CATEGORY_ID,
  CategoryTabs,
} from "@/components/menu/category-tabs";
import { MenuShopHeader } from "@/components/menu/menu-shop-header";
import { ProductCard } from "@/components/menu/product-card";
import { ProductSheet } from "@/components/product/product-sheet";
import { PageContent } from "@/components/layout/page-shell";
import { useLiveMenu } from "@/hooks/use-live-menu";
import { pickMenuHighlights } from "@/lib/best-sellers";
import type { Product } from "@/types";

export function MenuPageClient() {
  const { categories, products, toppings, addons } = useLiveMenu();
  const [activeCategory, setActiveCategory] = useState(ALL_MENU_CATEGORY_ID);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (
      activeCategory !== ALL_MENU_CATEGORY_ID &&
      !categories.some((category) => category.id === activeCategory)
    ) {
      setActiveCategory(ALL_MENU_CATEGORY_ID);
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    if (!selectedProduct) return;
    const updated = products.find((product) => product.id === selectedProduct.id);
    if (updated) setSelectedProduct(updated);
    else setSelectedProduct(null);
  }, [products, selectedProduct?.id]);

  const availableProducts = useMemo(
    () => products.filter((product) => product.isAvailable),
    [products],
  );

  const highlights = useMemo(
    () => pickMenuHighlights(availableProducts, []),
    [availableProducts],
  );

  const activeCategoryData = useMemo(
    () => categories.find((category) => category.id === activeCategory),
    [categories, activeCategory],
  );

  const isAllCategories = activeCategory === ALL_MENU_CATEGORY_ID;

  const categoryProducts = useMemo(
    () =>
      isAllCategories
        ? availableProducts
        : availableProducts.filter(
            (product) => product.categoryId === activeCategory,
          ),
    [availableProducts, activeCategory, isAllCategories],
  );

  return (
    <>
      <MenuShopHeader
        tabs={
          <CategoryTabs
            categories={categories}
            activeId={activeCategory}
            onChange={setActiveCategory}
            showAllTab
          />
        }
      />

      <PageContent className="flex min-w-0 flex-1 flex-col pb-6 lg:pb-8">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col py-5">
          {isAllCategories ? (
            <>
              <MenuHighlights
                title="เมนูใหม่"
                emoji="🆕"
                products={highlights.newest}
                onSelect={setSelectedProduct}
              />
              <MenuHighlights
                title="เมนูแนะนำ"
                emoji="⭐"
                products={highlights.recommended}
                onSelect={setSelectedProduct}
              />

              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-[var(--text)]">
                    เมนูทั้งหมด
                  </h2>
                </div>
                <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)] ring-1 ring-[var(--border)]">
                  {availableProducts.length} รายการ
                </span>
              </div>

              <div className="flex flex-col gap-2.5 sm:gap-3">
                {availableProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={setSelectedProduct}
                  />
                ))}
              </div>
            </>
          ) : activeCategoryData ? (
            <>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-[var(--text)]">
                    {activeCategoryData.emoji} {activeCategoryData.name}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {activeCategoryData.description}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)] ring-1 ring-[var(--border)]">
                  {categoryProducts.length} รายการ
                </span>
              </div>

              <div className="flex flex-col gap-2.5 sm:gap-3">
                {categoryProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={setSelectedProduct}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </PageContent>

      <ProductSheet
        product={selectedProduct}
        toppings={toppings}
        addons={addons}
        onClose={() => setSelectedProduct(null)}
      />
    </>
  );
}
