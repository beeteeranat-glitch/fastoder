"use client";

import { useEffect, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  formatDistance,
} from "@/lib/delivery-fee";
import { searchAddress, type AddressSearchResult } from "@/lib/reverse-geocode";

type LocationMapPickerProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (latitude: number, longitude: number) => void;
  maxMeters: number;
  deliveryRangeLabel: string;
  restaurant: {
    name: string;
    latitude: number;
    longitude: number;
  };
  initialPosition?: {
    latitude: number;
    longitude: number;
  } | null;
};

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

function MapClickHandler({
  onSelect,
}: {
  onSelect: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function MapViewport({
  latitude,
  longitude,
  zoom,
}: {
  latitude: number;
  longitude: number;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], zoom ?? Math.max(map.getZoom(), 16));
  }, [latitude, longitude, zoom, map]);

  return null;
}

export function LocationMapPicker({
  open,
  onClose,
  onConfirm,
  maxMeters,
  deliveryRangeLabel,
  restaurant,
  initialPosition,
}: LocationMapPickerProps) {
  const [selected, setSelected] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialPosition ?? null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AddressSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setSelected(initialPosition ?? null);
    setSearchQuery("");
    setSearchResults([]);
    setMapZoom(undefined);
  }, [open, initialPosition]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchAddress(query);
        setSearchResults(results);
      } finally {
        setSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [open, searchQuery]);

  if (!open) return null;

  const center = selected ?? {
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
  };

  const selectPosition = (latitude: number, longitude: number, zoom = 17) => {
    setSelected({ latitude, longitude });
    setMapZoom(zoom);
    setSearchResults([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="flex w-full max-w-lg flex-col rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="relative z-30 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <h3 className="font-display text-lg font-bold text-[var(--text)]">
            เลือกจุดจัดส่งบนแผนที่
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            ค้นหาซอย/ถนน หรือแตะบนแผนที่ — วงกลมสีฟ้าคือเขตจัดส่ง{" "}
            {deliveryRangeLabel}
          </p>
          <div className="relative z-30 mt-3">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ค้นหา เช่น ซอย 3 บางตลาด ปากเกร็ด"
              className="relative z-30 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text)] outline-none ring-[var(--primary)] focus:ring-2"
            />
            {searching ? (
              <p className="mt-1 text-xs text-[var(--text-muted)]">กำลังค้นหา...</p>
            ) : null}
            {searchResults.length > 0 ? (
              <ul className="absolute left-0 right-0 top-full z-[1100] mt-1 max-h-44 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
                {searchResults.map((result) => (
                  <li key={`${result.latitude}-${result.longitude}-${result.label}`}>
                    <button
                      type="button"
                      onClick={() =>
                        selectPosition(result.latitude, result.longitude, 18)
                      }
                      className="w-full px-3 py-2.5 text-left text-xs text-[var(--text)] hover:bg-[var(--surface-muted)]"
                    >
                      {result.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="relative z-0 h-[min(60vh,420px)] w-full overflow-hidden rounded-b-3xl">
          <MapContainer
            center={[center.latitude, center.longitude]}
            zoom={14}
            className="z-0 h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewport
              latitude={center.latitude}
              longitude={center.longitude}
              zoom={mapZoom}
            />
            <MapClickHandler
              onSelect={(latitude, longitude) =>
                selectPosition(latitude, longitude, 18)
              }
            />
            <Marker
              position={[restaurant.latitude, restaurant.longitude]}
              icon={shopIcon}
            />
            <Circle
              center={[restaurant.latitude, restaurant.longitude]}
              radius={maxMeters}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.08,
                weight: 2,
              }}
            />
            {selected ? (
              <Marker
                position={[selected.latitude, selected.longitude]}
                icon={customerIcon}
              />
            ) : null}
          </MapContainer>
        </div>

        <div className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--text-muted)]">
          แผนที่ระบุซอย/ถนนได้ถ้ามีในข้อมูล — บ้านเลขที่มักต้องกรอกเพิ่มเอง
        </div>

        <div className="flex gap-2 border-t border-[var(--border)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text-muted)]"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onConfirm(selected.latitude, selected.longitude);
              onClose();
            }}
            className="flex-1 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            ใช้ตำแหน่งนี้
          </button>
        </div>
      </div>
    </div>
  );
}
