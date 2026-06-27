"use client";

import { useEffect } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDistance } from "@/lib/delivery-fee";

function createPin(emoji: string, background: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:${background};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:18px;line-height:1">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
}

const shopIcon = createPin("🧋", "#fff7ed");
const customerIcon = createPin("📍", "#dbeafe");

function FitBounds({
  shopLat,
  shopLng,
  customerLat,
  customerLng,
}: {
  shopLat: number;
  shopLng: number;
  customerLat: number;
  customerLng: number;
}) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds(
      [shopLat, shopLng],
      [customerLat, customerLng],
    );
    map.fitBounds(bounds.pad(0.25));
  }, [shopLat, shopLng, customerLat, customerLng, map]);

  return null;
}

export function DeliveryMapReadonly({
  shopName,
  shopLat,
  shopLng,
  customerLat,
  customerLng,
  maxMeters,
  distanceMeters,
}: {
  shopName: string;
  shopLat: number;
  shopLng: number;
  customerLat: number;
  customerLng: number;
  maxMeters?: number;
  distanceMeters?: number | null;
}) {
  const centerLat = (shopLat + customerLat) / 2;
  const centerLng = (shopLng + customerLng) / 2;

  return (
    <div className="space-y-2">
      <div className="h-56 overflow-hidden rounded-2xl ring-1 ring-[var(--border)]">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={15}
          className="h-full w-full"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds
            shopLat={shopLat}
            shopLng={shopLng}
            customerLat={customerLat}
            customerLng={customerLng}
          />
          {maxMeters ? (
            <Circle
              center={[shopLat, shopLng]}
              radius={maxMeters}
              pathOptions={{
                color: "#0284c7",
                fillColor: "#0284c7",
                fillOpacity: 0.08,
                weight: 1,
              }}
            />
          ) : null}
          <Marker position={[shopLat, shopLng]} icon={shopIcon} />
          <Marker position={[customerLat, customerLng]} icon={customerIcon} />
        </MapContainer>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        {shopName}
        {distanceMeters != null ? ` · ระยะจัดส่ง ${formatDistance(distanceMeters)}` : ""}
      </p>
    </div>
  );
}
