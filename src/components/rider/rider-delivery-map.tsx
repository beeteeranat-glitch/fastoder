"use client";

import { useEffect } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDistance } from "@/lib/delivery-fee";

export type RiderMapOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  distance_meters: number | null;
  status: "READY_FOR_DELIVERY" | "DELIVERING";
};

type Point = { latitude: number; longitude: number };

function createPin(label: string, background: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;min-width:38px;height:38px;padding:0 8px;border-radius:999px;background:${background};border:3px solid #fff;box-shadow:0 3px 12px rgba(15,23,42,.28);font:700 12px system-ui;color:#fff;white-space:nowrap">${label}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -34],
  });
}

const shopIcon = createPin("ร้าน", "#f97316");
const readyIcon = createPin("รอรับ", "#d97706");
const deliveringIcon = createPin("กำลังส่ง", "#0284c7");
const riderIcon = createPin("🚚", "#16a34a");

function FitMap({ shop, orders, riderLocation }: { shop: Point; orders: RiderMapOrder[]; riderLocation: Point | null }) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [[shop.latitude, shop.longitude]];
    for (const order of orders) {
      if (order.delivery_latitude !== null && order.delivery_longitude !== null) {
        points.push([order.delivery_latitude, order.delivery_longitude]);
      }
    }
    if (riderLocation) points.push([riderLocation.latitude, riderLocation.longitude]);

    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points).pad(0.2), { maxZoom: 15 });
  }, [map, orders, riderLocation, shop]);

  return null;
}

export function RiderDeliveryMap({
  shop,
  orders,
  riderLocation,
  compact = false,
}: {
  shop: Point & { name: string };
  orders: RiderMapOrder[];
  riderLocation: Point | null;
  compact?: boolean;
}) {
  const mappedOrders = orders.filter(
    (order) => order.delivery_latitude !== null && order.delivery_longitude !== null,
  );

  return (
    <div
      className={`overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm ${
        compact ? "h-72" : "h-[calc(100vh-13rem)] min-h-[420px]"
      }`}
    >
      <MapContainer
        center={[shop.latitude, shop.longitude]}
        zoom={14}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitMap shop={shop} orders={mappedOrders} riderLocation={riderLocation} />
        <Circle
          center={[shop.latitude, shop.longitude]}
          radius={45}
          pathOptions={{ color: "#f97316", fillColor: "#fed7aa", fillOpacity: 0.35, weight: 1 }}
        />
        <Marker position={[shop.latitude, shop.longitude]} icon={shopIcon}>
          <Popup><strong>{shop.name}</strong><br />จุดรับสินค้า</Popup>
        </Marker>
        {riderLocation ? (
          <Marker position={[riderLocation.latitude, riderLocation.longitude]} icon={riderIcon}>
            <Popup><strong>รถจัดส่งของคุณ</strong><br />กำลังอัปเดตจาก GPS</Popup>
          </Marker>
        ) : null}
        {mappedOrders.map((order) => {
          const isReady = order.status === "READY_FOR_DELIVERY";
          const mapsUrl = `https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`;
          return (
            <Marker
              key={order.id}
              position={[order.delivery_latitude as number, order.delivery_longitude as number]}
              icon={isReady ? readyIcon : deliveringIcon}
            >
              <Popup>
                <div className="min-w-44 text-sm">
                  <strong>#{order.order_number}</strong>
                  <p className="mt-1">{order.customer_name}</p>
                  <p className="mt-1 text-xs">{order.delivery_address}</p>
                  {order.distance_meters !== null ? (
                    <p className="mt-1 text-xs">{formatDistance(order.distance_meters)}</p>
                  ) : null}
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex font-semibold text-sky-700 underline"
                  >
                    นำทางด้วย Google Maps
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
