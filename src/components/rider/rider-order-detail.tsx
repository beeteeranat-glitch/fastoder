"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatDistance } from "@/lib/delivery-fee";
import { formatPrice } from "@/lib/format";
import { formatPhoneForDisplay } from "@/lib/phone";
import { formatOrderDate } from "@/lib/orders";
import type { DbOrderStatus } from "@/types/database";

const RiderDeliveryMap = dynamic(
  () =>
    import("@/components/rider/rider-delivery-map").then(
      (module) => module.RiderDeliveryMap,
    ),
  { ssr: false },
);

type RiderOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  distance_meters: number | null;
  payable_total: number;
  payment_method: "cash" | "transfer";
  customer_note: string | null;
  delivery_proof_url: string | null;
  status: "READY_FOR_DELIVERY" | "DELIVERING";
  created_at: string;
};

type ShopLocation = { name: string; latitude: number; longitude: number };

export function RiderOrderDetail({
  orderId,
  returnToAdmin = false,
}: {
  orderId: string;
  returnToAdmin?: boolean;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<RiderOrder | null>(null);
  const [shop, setShop] = useState<ShopLocation | null>(null);
  const [riderLocation, setRiderLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const returnHref = returnToAdmin ? "/rider?from=admin" : "/rider";

  const loadOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/rider/orders/${orderId}`, { cache: "no-store" });
      const data = (await response.json()) as { order?: RiderOrder; error?: string };
      if (!response.ok || !data.order) {
        throw new Error(data.error ?? "โหลดงานจัดส่งไม่สำเร็จ");
      }
      setOrder(data.order);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดงานจัดส่งไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
    void fetch("/api/restaurant", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as Partial<ShopLocation>;
      })
      .then((value) => {
        if (
          value &&
          typeof value.name === "string" &&
          typeof value.latitude === "number" &&
          typeof value.longitude === "number"
        ) {
          setShop({ name: value.name, latitude: value.latitude, longitude: value.longitude });
        }
      });
  }, [loadOrder]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setRiderLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationMessage("ตำแหน่งรถกำลังอัปเดตแบบเรียลไทม์");
      },
      () => setLocationMessage("อนุญาต GPS เพื่อแสดงตำแหน่งรถของคุณ"),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const uploadProof = async () => {
    if (!order || !proofFile) {
      setError("กรุณาถ่ายหรือเลือกรูปหลักฐานก่อนอัปโหลด");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", proofFile);
      const response = await fetch(`/api/rider/orders/${order.id}/proof`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "อัปโหลดรูปหลักฐานไม่สำเร็จ");
      }
      setOrder({ ...order, delivery_proof_url: data.url });
      setProofFile(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "อัปโหลดรูปหลักฐานไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const updateStatus = async () => {
    if (!order) return;
    const nextStatus: DbOrderStatus =
      order.status === "READY_FOR_DELIVERY" ? "DELIVERING" : "COMPLETED";
    if (nextStatus === "COMPLETED" && !order.delivery_proof_url) {
      setError("กรุณาแนบรูปหลักฐานก่อนกดส่งสำเร็จ");
      return;
    }
    setUpdating(true);
    setError(null);
    try {
      const response = await fetch(`/api/rider/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "อัปเดตสถานะไม่สำเร็จ");
      }
      if (nextStatus === "COMPLETED") {
        router.replace(returnHref);
      } else {
        await loadOrder();
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <main className="min-h-screen bg-[var(--surface-muted)] px-5 py-10 text-center text-sm text-[var(--text-muted)]">กำลังโหลดงานจัดส่ง...</main>;
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[var(--surface-muted)] px-5 py-10">
        <div className="mx-auto max-w-xl rounded-3xl bg-[var(--surface)] p-6 text-center">
          <p className="text-rose-700">{error ?? "ไม่พบงานจัดส่ง"}</p>
          <Link href={returnHref} className="mt-4 inline-flex text-sm font-bold text-[var(--primary)]">กลับหน้ารายการงาน</Link>
        </div>
      </main>
    );
  }

  const isReady = order.status === "READY_FOR_DELIVERY";
  const mapsUrl =
    order.delivery_latitude !== null && order.delivery_longitude !== null
      ? `https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`;

  return (
    <main className="min-h-screen bg-[var(--surface-muted)] px-5 py-5">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap gap-3">
          <Link href={returnHref} className="inline-flex text-sm font-bold text-[var(--primary)]">← กลับหน้ารายการงาน</Link>
          {returnToAdmin ? <Link href="/admin/orders" className="inline-flex text-sm font-bold text-[var(--text-muted)]">กลับหน้าแอดมิน</Link> : null}
        </div>
        <header className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">FastOrder Rider</p>
              <h1 className="mt-1 font-display text-3xl font-bold text-[var(--text)]">#{order.order_number}</h1>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{formatOrderDate(order.created_at)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${isReady ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"}`}>
              {isReady ? "พร้อมรับไปส่ง" : "กำลังจัดส่ง"}
            </span>
          </div>
        </header>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-display text-xl font-bold text-[var(--text)]">จุดจัดส่ง</h2>
          <p className="mt-2 font-semibold text-[var(--text)]">{order.customer_name}</p>
          <a href={`tel:${order.customer_phone}`} className="mt-1 inline-flex text-sm font-bold text-[var(--primary)]">โทร {formatPhoneForDisplay(order.customer_phone)}</a>
          <p className="mt-3 text-sm leading-6 text-[var(--text)]">{order.delivery_address}</p>
          {order.distance_meters !== null ? <p className="mt-2 text-xs text-[var(--text-muted)]">ระยะทางจากร้าน {formatDistance(order.distance_meters)} · ยอด {formatPrice(order.payable_total)}</p> : null}
          {order.customer_note ? <p className="mt-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-muted)]">หมายเหตุ: {order.customer_note}</p> : null}
          <div className="mt-4">
            {shop ? <RiderDeliveryMap shop={shop} orders={[order]} riderLocation={riderLocation} compact /> : <div className="flex h-72 items-center justify-center rounded-3xl bg-[var(--surface-muted)] text-sm text-[var(--text-muted)]">กำลังโหลดแผนที่...</div>}
          </div>
          {locationMessage ? <p className="mt-2 text-xs text-[var(--text-muted)]">🚚 {locationMessage}</p> : null}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-4 py-3 text-sm font-bold text-[var(--primary)]">เปิดนำทางใน Google Maps</a>
        </section>

        {!isReady ? (
          <section className="rounded-3xl border border-dashed border-sky-300 bg-sky-50/60 p-5">
            <h2 className="font-display text-xl font-bold text-sky-950">หลักฐานการส่ง</h2>
            <p className="mt-1 text-sm text-sky-800">ต้องแนบรูปก่อนกดส่งสำเร็จ</p>
            {order.delivery_proof_url ? (
              <a
                href={order.delivery_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block overflow-hidden rounded-2xl border border-sky-200 bg-white"
              >
                <Image
                  src={order.delivery_proof_url}
                  alt={`รูปหลักฐานการส่งออร์เดอร์ ${order.order_number}`}
                  width={900}
                  height={700}
                  unoptimized
                  className="max-h-80 w-full object-contain"
                />
                <p className="border-t border-sky-100 px-3 py-2 text-xs font-bold text-[var(--primary)]">
                  แตะรูปเพื่อเปิดขนาดเต็ม
                </p>
              </a>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-xl border border-sky-300 bg-white px-3 py-2.5 text-sm font-bold text-sky-800">
                  ถ่ายรูป / เลือกรูป
                  <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event) => setProofFile(event.target.files?.[0] ?? null)} />
                </label>
                <button type="button" disabled={!proofFile || uploading} onClick={() => void uploadProof()} className="rounded-xl bg-sky-700 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                  {uploading ? "กำลังอัปโหลด..." : "อัปโหลดหลักฐาน"}
                </button>
                {proofFile ? <span className="max-w-52 truncate text-xs text-sky-900">{proofFile.name}</span> : null}
              </div>
            )}
          </section>
        ) : null}

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <button type="button" disabled={updating} onClick={() => void updateStatus()} className="w-full rounded-2xl bg-[var(--primary)] px-4 py-4 text-base font-bold text-white transition hover:opacity-90 disabled:opacity-60">
          {updating ? "กำลังอัปเดต..." : isReady ? "เริ่มจัดส่ง" : "ส่งสำเร็จ"}
        </button>
      </div>
    </main>
  );
}
