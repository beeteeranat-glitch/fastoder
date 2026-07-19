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
  openingTime: string;
  closingTime: string;
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
const DEFAULT_OPENING_TIME = "09:00";
const DEFAULT_CLOSING_TIME = "18:00";
const RESTAURANT_SELECT =
  "id, name, address, latitude, longitude, is_open, closing_until, open_days, opening_time, closing_time, logo_url, bank_name, bank_account_number, bank_account_name, payment_qr_url, delivery_radius_meters, delivery_min_meters, delivery_block_meters";
const PRE_BUSINESS_HOURS_RESTAURANT_SELECT =
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
  openingTime: DEFAULT_OPENING_TIME,
  closingTime: DEFAULT_CLOSING_TIME,
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

function normalizeTime(value: string | null | undefined, fallback: string) {
  return /^\d{2}:\d{2}/.test(value ?? "") ? value!.slice(0, 5) : fallback;
}

function getShopMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SHOP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function mapRestaurant(row: DbRestaurant): ShopProfile {
  const now = new Date();
  const closingUntil = row.closing_until ? new Date(row.closing_until) : null;
  const openDays = normalizeOpenDays(row.open_days);
  const openingTime = normalizeTime(row.opening_time, DEFAULT_OPENING_TIME);
  const closingTime = normalizeTime(row.closing_time, DEFAULT_CLOSING_TIME);
  const isWithinBusinessHours =
    getShopMinutes(now) >= timeToMinutes(openingTime) &&
    getShopMinutes(now) < timeToMinutes(closingTime);
  const isScheduledOpen =
    openDays.includes(getShopWeekday(now)) && isWithinBusinessHours;
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
    openingTime,
    closingTime,
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

  if (
    response.error?.message.includes("opening_time") ||
    response.error?.message.includes("closing_time")
  ) {
    const preBusinessHoursResponse = await supabase
      .from("restaurants")
      .select(PRE_BUSINESS_HOURS_RESTAURANT_SELECT)
      .eq("id", RESTAURANT.id)
      .single();

    if (!preBusinessHoursResponse.error && preBusinessHoursResponse.data) {
      return mapRestaurant(preBusinessHoursResponse.data as DbRestaurant);
    }
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
  opening_time?: string;
  closing_time?: string;
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
  const response = await supabase
    .from("restaurants")
    .update(updates)
    .eq("id", RESTAURANT.id)
    .select(RESTAURANT_SELECT)
    .single();

  if (!response.error && response.data) {
    return mapRestaurant(response.data as DbRestaurant);
  }

  if (
    response.error?.message.includes("opening_time") ||
    response.error?.message.includes("closing_time")
  ) {
    const {
      opening_time: _openingTime,
      closing_time: _closingTime,
      ...preBusinessHoursUpdates
    } = updates;
    const fallbackResponse = await supabase
      .from("restaurants")
      .update(preBusinessHoursUpdates)
      .eq("id", RESTAURANT.id)
      .select(PRE_BUSINESS_HOURS_RESTAURANT_SELECT)
      .single();

    if (!fallbackResponse.error && fallbackResponse.data) {
      return mapRestaurant(fallbackResponse.data as DbRestaurant);
    }
  }

  console.error("updateRestaurant error:", response.error);
  return null;
}
