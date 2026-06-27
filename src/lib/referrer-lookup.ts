import {
  fetchActiveReferrerByPhone,
  fetchReferrerNameByPhone,
  type ReferrerDefinition,
} from "@/lib/referrer-data";
import {
  isValidReferrerPhone,
  normalizeReferrerPhone,
} from "@/lib/promotions";

export type { ReferrerDefinition };

export async function lookupReferrerInDb(
  phone: string,
): Promise<ReferrerDefinition | null> {
  const normalized = normalizeReferrerPhone(phone);
  if (!isValidReferrerPhone(normalized)) return null;
  return fetchActiveReferrerByPhone(normalized);
}

export async function getReferrerDisplayNameFromDb(phone: string) {
  return fetchReferrerNameByPhone(phone);
}
