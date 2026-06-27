import { RESTAURANT } from "@/data/menu";
import { createServerClient } from "@/lib/supabase/server";
import type { DbRestaurant } from "@/types/database";

export type ShopProfile = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  logoUrl: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  paymentQrUrl: string | null;
};

export const DEFAULT_SHOP: ShopProfile = {
  id: RESTAURANT.id,
  name: RESTAURANT.name,
  address: RESTAURANT.address,
  latitude: RESTAURANT.latitude,
  longitude: RESTAURANT.longitude,
  logoUrl: null,
  bankName: "กสิกรไทย",
  bankAccountNumber: "123-4-56789-0",
  bankAccountName: RESTAURANT.name,
  paymentQrUrl: "/payment-qr-example.svg",
};

export function mapRestaurant(row: DbRestaurant): ShopProfile {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    logoUrl: row.logo_url ?? null,
    bankName: row.bank_name ?? null,
    bankAccountNumber: row.bank_account_number ?? null,
    bankAccountName: row.bank_account_name ?? null,
    paymentQrUrl: row.payment_qr_url ?? null,
  };
}

export async function fetchRestaurantFromDb(): Promise<ShopProfile | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      "id, name, address, latitude, longitude, logo_url, bank_name, bank_account_number, bank_account_name, payment_qr_url, delivery_radius_meters, delivery_min_meters, delivery_block_meters",
    )
    .eq("id", RESTAURANT.id)
    .single();

  if (error || !data) {
    console.error("fetchRestaurant error:", error);
    return null;
  }

  return mapRestaurant(data as DbRestaurant);
}

export async function updateRestaurantInDb(updates: {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  logo_url?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  payment_qr_url?: string | null;
}) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("restaurants")
    .update(updates)
    .eq("id", RESTAURANT.id)
    .select(
      "id, name, address, latitude, longitude, logo_url, bank_name, bank_account_number, bank_account_name, payment_qr_url, delivery_radius_meters, delivery_min_meters, delivery_block_meters",
    )
    .single();

  if (error || !data) {
    console.error("updateRestaurant error:", error);
    return null;
  }

  return mapRestaurant(data as DbRestaurant);
}
