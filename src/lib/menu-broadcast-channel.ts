import { RESTAURANT } from "@/data/menu";

export function menuBroadcastChannel() {
  return `menu:${RESTAURANT.id}`;
}
