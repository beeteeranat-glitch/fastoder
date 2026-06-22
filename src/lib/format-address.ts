type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  province?: string;
  postcode?: string;
};

export type GeocodeResult = {
  streetLine: string | null;
  areaAddress: string;
  houseNumber: string | null;
  baseAddress: string;
};

function withPrefix(value: string, prefix: string, also?: string[]) {
  if (value.startsWith(prefix) || also?.some((p) => value.startsWith(p))) {
    return value;
  }
  return `${prefix}${value}`;
}

function formatStreetLine(address: NominatimAddress): string | null {
  if (address.road) {
    const road = address.road.trim();
    if (/^ซอย/i.test(road) || /^soi\s/i.test(road)) {
      return road.replace(/^soi\s/i, "ซอย");
    }
    return withPrefix(road, "ถนน");
  }

  const neighbourhood = address.neighbourhood?.trim();
  if (neighbourhood && /ซอย|soi/i.test(neighbourhood)) {
    return neighbourhood.replace(/^soi\s/i, "ซอย");
  }

  return null;
}

function formatAreaAddress(address: NominatimAddress) {
  const parts: string[] = [];

  const subdistrict =
    address.suburb || address.city_district || address.neighbourhood;
  if (subdistrict && !/ซอย|soi/i.test(subdistrict)) {
    parts.push(withPrefix(subdistrict, "แขวง", ["ต.", "ตำบล"]));
  }

  const district = address.county || address.municipality;
  if (district) {
    parts.push(withPrefix(district, "เขต", ["อ.", "อำเภอ"]));
  }

  const province = address.province || address.state || address.city;
  if (province && province !== district) {
    parts.push(province);
  }

  if (address.postcode) {
    parts.push(address.postcode);
  }

  return parts.join(" ");
}

export function formatThaiAddress(address: NominatimAddress): GeocodeResult {
  const streetLine = formatStreetLine(address);
  const areaAddress = formatAreaAddress(address);
  const houseNumber = address.house_number ?? null;
  const baseAddress = [streetLine, areaAddress].filter(Boolean).join(" ");

  return {
    streetLine,
    areaAddress,
    houseNumber,
    baseAddress,
  };
}

export function formatDeliveryAddress({
  houseDetail,
  streetLine,
  areaAddress,
  geocodedHouseNumber,
}: {
  houseDetail: string;
  streetLine: string;
  areaAddress: string;
  geocodedHouseNumber?: string | null;
}) {
  const house = houseDetail.trim() || geocodedHouseNumber?.trim() || "";
  const parts = [house, streetLine.trim(), areaAddress.trim()].filter(Boolean);
  return parts.join(" ");
}
