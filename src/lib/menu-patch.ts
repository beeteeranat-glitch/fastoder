import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  mapAddon,
  mapCategory,
  mapProduct,
  mapTopping,
  type MenuData,
} from "@/lib/menu-data";
import type {
  DbAddon,
  DbCategory,
  DbProduct,
  DbTopping,
} from "@/types/database";

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index === -1) return [...list, item];
  const next = [...list];
  next[index] = item;
  return next;
}

function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((entry) => entry.id !== id);
}

export function patchMenuFromRealtime(
  menu: MenuData,
  table: string,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  options: { customerView?: boolean } = {},
): MenuData {
  const customerView = options.customerView ?? true;
  const recordId =
    (payload.new as { id?: string } | undefined)?.id ??
    (payload.old as { id?: string } | undefined)?.id;

  if (payload.eventType === "DELETE" && recordId) {
    switch (table) {
      case "products":
        return { ...menu, products: removeById(menu.products, recordId) };
      case "categories":
        return { ...menu, categories: removeById(menu.categories, recordId) };
      case "toppings":
        return { ...menu, toppings: removeById(menu.toppings, recordId) };
      case "addons":
        return { ...menu, addons: removeById(menu.addons, recordId) };
      default:
        return menu;
    }
  }

  const row = payload.new;
  if (!row || payload.eventType === "DELETE") return menu;

  switch (table) {
    case "products":
      return {
        ...menu,
        products: upsertById(menu.products, mapProduct(row as DbProduct)),
      };
    case "categories":
      return {
        ...menu,
        categories: upsertById(menu.categories, mapCategory(row as DbCategory)),
      };
    case "toppings": {
      const topping = mapTopping(row as DbTopping);
      if (customerView && topping.isAvailable === false) {
        return { ...menu, toppings: removeById(menu.toppings, topping.id) };
      }
      return { ...menu, toppings: upsertById(menu.toppings, topping) };
    }
    case "addons": {
      const addon = mapAddon(row as DbAddon);
      if (customerView && addon.isAvailable === false) {
        return { ...menu, addons: removeById(menu.addons, addon.id) };
      }
      return { ...menu, addons: upsertById(menu.addons, addon) };
    }
    default:
      return menu;
  }
}
