import { NextRequest, NextResponse } from "next/server";

type SearchResult = {
  latitude: number;
  longitude: number;
  label: string;
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "th");
  url.searchParams.set("limit", "6");
  url.searchParams.set("accept-language", "th");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "FastOrder/1.0 (food delivery demo)",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "search failed" }, { status: 502 });
  }

  const data = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  const results: SearchResult[] = data.map((item) => ({
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    label: item.display_name,
  }));

  return NextResponse.json({ results });
}
