import { RESTAURANT } from "@/data/menu";
import { createServerClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

export type BestSellerItem = {
  productId: string;
  productName: string;
  quantitySold: number;
};

export async function fetchBestSellers(limit = 5): Promise<BestSellerItem[]> {
  const supabase = createServerClient();

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id")
    .eq("restaurant_id", RESTAURANT.id)
    .eq("status", "COMPLETED");

  if (ordersError || !orders?.length) return [];

  const orderIds = orders.map((o) => o.id);

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, product_name, quantity")
    .in("order_id", orderIds);

  if (itemsError || !items?.length) return [];

  const counts = new Map<string, BestSellerItem>();
  for (const item of items) {
    const existing = counts.get(item.product_id);
    if (existing) {
      existing.quantitySold += item.quantity;
    } else {
      counts.set(item.product_id, {
        productId: item.product_id,
        productName: item.product_name,
        quantitySold: item.quantity,
      });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, limit);
}

export function pickMenuHighlights(
  products: Product[],
  bestSellers: BestSellerItem[],
) {
  const bestSellerIds = new Set(bestSellers.map((item) => item.productId));

  const bestSellerProducts = bestSellers
    .map((item) => products.find((p) => p.id === item.productId))
    .filter((p): p is Product => Boolean(p && p.isAvailable));

  const recommended = products.filter(
    (p) => p.isAvailable && (p as Product & { isRecommended?: boolean }).isRecommended,
  );

  const isNewProduct = (p: Product & { isNew?: boolean; createdAt?: string }) => {
    if (p.isNew) return true;
    if (p.createdAt) {
      const age = Date.now() - new Date(p.createdAt).getTime();
      return age < 30 * 24 * 60 * 60 * 1000;
    }
    return false;
  };

  const newest = products.filter(
    (p) => p.isAvailable && isNewProduct(p as Product & { isNew?: boolean }),
  );

  const fallbackBest = products
    .filter((p) => p.isAvailable && bestSellerIds.has(p.id))
    .slice(0, 5);

  return {
    bestSellers: bestSellerProducts.length ? bestSellerProducts : fallbackBest,
    recommended: recommended.slice(0, 5),
    newest: newest.slice(0, 5),
  };
}
