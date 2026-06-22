import type { GeocodeResult } from "@/lib/format-address";

export type AddressSearchResult = {
  latitude: number;
  longitude: number;
  label: string;
};

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });

  const response = await fetch(`/api/geocode?${params}`);
  if (!response.ok) return null;

  const data = (await response.json()) as {
    streetLine?: string | null;
    areaAddress?: string | null;
    houseNumber?: string | null;
    baseAddress?: string | null;
    address?: string | null;
  };

  const areaAddress = data.areaAddress ?? data.baseAddress ?? data.address;
  if (!areaAddress) return null;

  return {
    streetLine: data.streetLine ?? null,
    areaAddress,
    houseNumber: data.houseNumber ?? null,
    baseAddress: data.baseAddress ?? areaAddress,
  };
}

export async function searchAddress(
  query: string,
): Promise<AddressSearchResult[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/geocode/search?${params}`);
  if (!response.ok) return [];

  const data = (await response.json()) as { results?: AddressSearchResult[] };
  return data.results ?? [];
}
