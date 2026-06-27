import {
  ADDONS,
  CATEGORIES,
  PRODUCTS,
  RESTAURANT,
  TOPPINGS,
} from "@/data/menu";
import { createServerClient } from "@/lib/supabase/server";
import type { Addon, Category, Product, Topping } from "@/types";
import type {
  DbAddon,
  DbCategory,
  DbProduct,
  DbTopping,
} from "@/types/database";

export type MenuData = {
  categories: Category[];
  products: Product[];
  toppings: Topping[];
  addons: Addon[];
};

export function mapCategory(row: DbCategory): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    emoji: row.emoji ?? "🍹",
    imageUrl: row.image_url,
  };
}

export function mapProduct(row: DbProduct): Product {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description ?? "",
    basePrice: row.base_price,
    gradient: row.gradient ?? "from-sky-400 to-blue-500",
    emoji: row.emoji ?? "🧋",
    isAvailable: row.is_available,
    isRecommended: row.is_recommended ?? false,
    isNew: row.is_new ?? false,
    createdAt: row.created_at,
    imageUrl: row.image_url,
  };
}

export function mapTopping(row: DbTopping): Topping {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    imageUrl: row.image_url,
    isAvailable: row.is_available,
  };
}

export function mapAddon(row: DbAddon): Addon {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    imageUrl: row.image_url,
    isAvailable: row.is_available,
  };
}

export async function seedMenuIfEmpty() {
  const supabase = createServerClient();
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", RESTAURANT.id);

  if ((count ?? 0) > 0) return false;

  await supabase.from("categories").upsert(
    CATEGORIES.map((category, index) => ({
      id: category.id,
      restaurant_id: RESTAURANT.id,
      name: category.name,
      description: category.description,
      emoji: category.emoji,
      sort_order: index,
    })),
  );

  await supabase.from("products").upsert(
    PRODUCTS.map((product, index) => ({
      id: product.id,
      restaurant_id: RESTAURANT.id,
      category_id: product.categoryId,
      name: product.name,
      description: product.description,
      base_price: product.basePrice,
      emoji: product.emoji,
      gradient: product.gradient,
      is_available: product.isAvailable,
      sort_order: index,
    })),
  );

  await supabase.from("toppings").upsert(
    TOPPINGS.map((topping, index) => ({
      id: topping.id,
      restaurant_id: RESTAURANT.id,
      name: topping.name,
      price: topping.price,
      sort_order: index,
      is_available: true,
    })),
  );

  await supabase.from("addons").upsert(
    ADDONS.map((addon, index) => ({
      id: addon.id,
      restaurant_id: RESTAURANT.id,
      name: addon.name,
      price: addon.price,
      sort_order: index,
      is_available: true,
    })),
  );

  return true;
}

export async function fetchMenuFromDb(): Promise<MenuData | null> {
  const supabase = createServerClient();

  const [categoriesRes, productsRes, toppingsRes, addonsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", RESTAURANT.id)
      .order("sort_order"),
    supabase
      .from("products")
      .select("*")
      .eq("restaurant_id", RESTAURANT.id)
      .order("sort_order"),
    supabase
      .from("toppings")
      .select("*")
      .eq("restaurant_id", RESTAURANT.id)
      .order("sort_order"),
    supabase
      .from("addons")
      .select("*")
      .eq("restaurant_id", RESTAURANT.id)
      .order("sort_order"),
  ]);

  if (
    categoriesRes.error ||
    productsRes.error ||
    toppingsRes.error ||
    addonsRes.error
  ) {
    console.error("fetchMenuFromDb errors:", {
      categories: categoriesRes.error,
      products: productsRes.error,
      toppings: toppingsRes.error,
      addons: addonsRes.error,
    });
    return null;
  }

  if (!productsRes.data?.length) return null;

  return {
    categories: (categoriesRes.data ?? []).map(mapCategory),
    products: (productsRes.data ?? []).map(mapProduct),
    toppings: (toppingsRes.data ?? [])
      .filter((row) => row.is_available)
      .map(mapTopping),
    addons: (addonsRes.data ?? [])
      .filter((row) => row.is_available)
      .map(mapAddon),
  };
}

export async function fetchAdminMenuFromDb(): Promise<MenuData | null> {
  await seedMenuIfEmpty();
  const supabase = createServerClient();

  const [categoriesRes, productsRes, toppingsRes, addonsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", RESTAURANT.id)
      .order("sort_order"),
    supabase
      .from("products")
      .select("*")
      .eq("restaurant_id", RESTAURANT.id)
      .order("sort_order"),
    supabase
      .from("toppings")
      .select("*")
      .eq("restaurant_id", RESTAURANT.id)
      .order("sort_order"),
    supabase
      .from("addons")
      .select("*")
      .eq("restaurant_id", RESTAURANT.id)
      .order("sort_order"),
  ]);

  if (
    categoriesRes.error ||
    productsRes.error ||
    toppingsRes.error ||
    addonsRes.error
  ) {
    return null;
  }

  return {
    categories: (categoriesRes.data ?? []).map(mapCategory),
    products: (productsRes.data ?? []).map(mapProduct),
    toppings: (toppingsRes.data ?? []).map(mapTopping),
    addons: (addonsRes.data ?? []).map(mapAddon),
  };
}

export function getStaticMenu(): MenuData {
  return {
    categories: CATEGORIES,
    products: PRODUCTS,
    toppings: TOPPINGS,
    addons: ADDONS,
  };
}
