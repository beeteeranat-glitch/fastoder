import { RESTAURANT } from "@/data/menu";
import { createServerClient } from "@/lib/supabase/server";
import type { DbRestaurant } from "@/types/database";

export type ShopProfile = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  isManuallyOpen: boolean;
  closingUntil: string | null;
  openDays: number[];
  logoUrl: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  paymentQrUrl: string | null;
  deliveryMinMeters: number;
  deliveryMaxMeters: number;
  deliveryBlockMeters: number;
};

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const SHOP_TIME_ZONE = "Asia/Bangkok";
const RESTAURANT_SELECT =
  "id, name, address, latitude, longitude, is_open, closing_until, open_days, logo_url, bank_name, bank_account_number, bank_account_name, payment_qr_url, delivery_radius_meters, delivery_min_meters, delivery_block_meters";
const LEGACY_RESTAURANT_SELECT =
  "id, name, address, latitude, longitude, is_open, closing_until, logo_url, bank_name, bank_account_number, bank_account_name, payment_qr_url, delivery_radius_meters, delivery_min_meters, delivery_block_meters";

export const DEFAULT_SHOP: ShopProfile = {
  id: RESTAURANT.id,
  name: RESTAURANT.name,
  address: RESTAURANT.address,
  latitude: RESTAURANT.latitude,
  longitude: RESTAURANT.longitude,
  isOpen: true,
  isManuallyOpen: true,
  closingUntil: null,
  openDays: EVERY_DAY,
  logoUrl: null,
  bankName: "กสิกรไทย",
  bankAccountNumber: "123-4-56789-0",
  bankAccountName: RESTAURANT.name,
  paymentQrUrl: "/payment-qr-example.svg",
  deliveryMinMeters: 500,
  deliveryMaxMeters: RESTAURANT.deliveryRadius,
  deliveryBlockMeters: 500,
};

function getShopWeekday(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: SHOP_TIME_ZONE,
  }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

function normalizeOpenDays(days: number[] | null | undefined) {
  if (!Array.isArray(days)) return EVERY_DAY;
  const validDays = Array.from(
    new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)),
  ).sort((a, b) => a - b);
  return validDays.length > 0 ? validDays : EVERY_DAY;
}

export function mapRestaurant(row: DbRestaurant): ShopProfile {
  const now = new Date();
  const closingUntil = row.closing_until ? new Date(row.closing_until) : null;
  const openDays = normalizeOpenDays(row.open_days);
  const isScheduledOpen = openDays.includes(getShopWeekday(now));
  const isManuallyOpen = row.is_open || (closingUntil !== null && closingUntil <= now);
  const isOpen = isManuallyOpen && isScheduledOpen;

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    isOpen,
    isManuallyOpen,
    closingUntil: row.closing_until && closingUntil !== null && closingUntil > now
      ? row.closing_until
      : null,
    openDays,
    logoUrl: row.logo_url ?? null,
    bankName: row.bank_name ?? null,
    bankAccountNumber: row.bank_account_number ?? null,
    bankAccountName: row.bank_account_name ?? null,
    paymentQrUrl: row.payment_qr_url ?? null,
    deliveryMinMeters: row.delivery_min_meters,
    deliveryMaxMeters: row.delivery_radius_meters,
    deliveryBlockMeters: row.delivery_block_meters,
  };
}

export async function fetchRestaurantFromDb(): Promise<ShopProfile | null> {
  const supabase = createServerClient();

  const response = await supabase
    .from("restaurants")
    .select(RESTAURANT_SELECT)
    .eq("id", RESTAURANT.id)
    .single();

  if (!response.error && response.data) {
    return mapRestaurant(response.data as DbRestaurant);
  }

  if (response.error?.message.includes("open_days")) {
    const legacyResponse = await supabase
      .from("restaurants")
      .select(LEGACY_RESTAURANT_SELECT)
      .eq("id", RESTAURANT.id)
      .single();

    if (!legacyResponse.error && legacyResponse.data) {
      return mapRestaurant(legacyResponse.data as DbRestaurant);
    }
  }

  console.error("fetchRestaurant error:", response.error);
  return null;
}

export async function updateRestaurantInDb(updates: {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  is_open?: boolean;
  closing_until?: string | null;
  open_days?: number[];
  logo_url?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  payment_qr_url?: string | null;
  delivery_min_meters?: number;
  delivery_radius_meters?: number;
  delivery_block_meters?: number;
}) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("restaurants")
    .update(updates)
    .eq("id", RESTAURANT.id)
    .select(RESTAURANT_SELECT)
    .single();

  if (error || !data) {
    console.error("updateRestaurant error:", error);
    return null;
  }

  return mapRestaurant(data as DbRestaurant);
}
