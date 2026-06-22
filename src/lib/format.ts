import type { Addon, CartItem, Topping } from "@/types";

export function formatPrice(amount: number) {
  return `฿${amount.toLocaleString("th-TH")}`;
}

export function calcItemUnitPrice(
  basePrice: number,
  options: CartItem["options"],
  toppings: Topping[],
  addons: Addon[],
) {
  let total = basePrice;
  if (options.blended) total += 5;
  if (options.largeCup) total += 10;
  total += toppings.reduce((sum, t) => sum + t.price, 0);
  total += addons.reduce((sum, a) => sum + a.price, 0);
  return total;
}

export function calcCartTotal(items: CartItem[]) {
  return items.reduce(
    (sum, item) =>
      sum +
      calcItemUnitPrice(
        item.basePrice,
        item.options,
        item.toppings,
        item.addons,
      ) *
        item.quantity,
    0,
  );
}

export function calcDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
