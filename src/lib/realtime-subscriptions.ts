import { RESTAURANT } from "@/data/menu";
import type { RealtimeTableSubscription } from "@/hooks/use-realtime-refetch";

const restaurantFilter = `restaurant_id=eq.${RESTAURANT.id}`;

export const RESTAURANT_REALTIME_SUBS: RealtimeTableSubscription[] = [
  { table: "restaurants", filter: `id=eq.${RESTAURANT.id}` },
];

export const ORDERS_REALTIME_SUBS: RealtimeTableSubscription[] = [
  { table: "orders", filter: restaurantFilter },
];

export const MENU_REALTIME_TABLES = [
  "products",
  "categories",
  "toppings",
  "addons",
] as const;

export const MENU_REALTIME_SUBS: RealtimeTableSubscription[] =
  MENU_REALTIME_TABLES.map((table) => ({
    table,
    filter: restaurantFilter,
  }));

export function orderDetailRealtimeSubs(orderId: string): RealtimeTableSubscription[] {
  return [{ table: "orders", filter: `id=eq.${orderId}` }];
}

export function customerProfileRealtimeSubs(
  customerId: string,
): RealtimeTableSubscription[] {
  return [{ table: "customers", filter: `id=eq.${customerId}` }];
}

export function customerOrdersRealtimeSubs(
  phone: string,
): RealtimeTableSubscription[] {
  return [{ table: "orders", filter: `customer_phone=eq.${phone}` }];
}
