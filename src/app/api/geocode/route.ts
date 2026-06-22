import { NextRequest, NextResponse } from "next/server";
import { formatThaiAddress } from "@/lib/format-address";

type NominatimResponse = {
  display_name?: string;
  address?: Parameters<typeof formatThaiAddress>[0];
};

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "missing coordinates" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("accept-language", "th");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "19");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "FastOrder/1.0 (food delivery demo)",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "geocode failed" }, { status: 502 });
  }

  const data = (await response.json()) as NominatimResponse;
  const formatted = data.address
    ? formatThaiAddress(data.address)
    : {
        streetLine: null,
        areaAddress: data.display_name ?? "",
        houseNumber: null,
        baseAddress: data.display_name ?? "",
      };

  return NextResponse.json({
    streetLine: formatted.streetLine,
    areaAddress: formatted.areaAddress || null,
    houseNumber: formatted.houseNumber,
    baseAddress: formatted.baseAddress || data.display_name || null,
    address: formatted.baseAddress || data.display_name || null,
  });
}
