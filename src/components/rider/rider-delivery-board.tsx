"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import { useLoginLockout } from "@/hooks/use-login-lockout";
import { formatDistance } from "@/lib/delivery-fee";
import { formatPrice } from "@/lib/format";
import { formatPhoneForDisplay } from "@/lib/phone";
import { formatOrderDate } from "@/lib/orders";
import { ORDERS_REALTIME_SUBS } from "@/lib/realtime-subscriptions";
import type { DbOrderStatus } from "@/types/database";

const RiderDeliveryMap = dynamic(
  () =>
    import("@/components/rider/rider-delivery-map").then(
      (module) => module.RiderDeliveryMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-muted)]">
        กำลังเปิดแผนที่...
      </div>
    ),
  },
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
  status: Extract<DbOrderStatus, "READY_FOR_DELIVERY" | "DELIVERING">;
  created_at: string;
};

type RiderOrdersResponse = {
  orders?: RiderOrder[];
  readyCount?: number;
  deliveringCount?: number;
  error?: string;
};

type RiderView = "jobs" | "map";

type ShopLocation = {
  name: string;
  latitude: number;
  longitude: number;
};

export function RiderDeliveryBoard({
  initiallyAuthenticated,
  initialView = "jobs",
}: {
  initiallyAuthenticated: boolean;
  initialView?: RiderView;
}) {
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [readyCount, setReadyCount] = useState(0);
  const [deliveringCount, setDeliveringCount] = useState(0);
  const [loading, setLoading] = useState(initiallyAuthenticated);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [uploadingProofId, setUploadingProofId] = useState<string | null>(null);
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [shopLocation, setShopLocation] = useState<ShopLocation | null>(null);
  const [riderLocation, setRiderLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const lockout = useLoginLockout("/api/rider/session", !authenticated);

  const loadOrders = useCallback(async () => {
    if (!authenticated) return;
    try {
      const response = await fetch("/api/rider/orders", { cache: "no-store" });
      const data = (await response.json()) as RiderOrdersResponse;
      if (response.status === 401) {
        setAuthenticated(false);
        setOrders([]);
        return;
      }
      if (!response.ok) {
        throw new Error(data.error ?? "โหลดงานจัดส่งไม่สำเร็จ");
      }
      setOrders(data.orders ?? []);
      setReadyCount(data.readyCount ?? 0);
      setDeliveringCount(data.deliveringCount ?? 0);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "โหลดงานจัดส่งไม่สำเร็จ",
      );
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    void loadOrders();
  }, [authenticated, loadOrders]);

  useRealtimeRefetch(ORDERS_REALTIME_SUBS, loadOrders, authenticated);

  useEffect(() => {
    if (!authenticated) return;
    void fetch("/api/restaurant", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as Partial<ShopLocation>;
      })
      .then((shop) => {
        if (
          shop &&
          typeof shop.name === "string" &&
          typeof shop.latitude === "number" &&
          typeof shop.longitude === "number"
        ) {
          setShopLocation({
            name: shop.name,
            latitude: shop.latitude,
            longitude: shop.longitude,
          });
        }
      });
  }, [authenticated]);

  const updateRiderLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง");
      return;
    }

    setLocationMessage("กำลังค้นหาตำแหน่งของคุณ...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setRiderLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationMessage("อัปเดตตำแหน่งรถแล้ว");
      },
      () => setLocationMessage("ไม่สามารถอ่าน GPS ได้ กรุณาอนุญาตการใช้ตำแหน่ง"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  };

  useEffect(() => {
    if (authenticated && initialView === "map") updateRiderLocation();
  }, [authenticated, initialView]);

  useEffect(() => {
    const shouldTrack =
      authenticated &&
      (initialView === "map" || (initialView === "jobs" && orders.length > 0));
    if (!shouldTrack || !navigator.geolocation) return;

    setLocationMessage("กำลังติดตามตำแหน่งรถแบบเรียลไทม์...");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setRiderLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationMessage("ตำแหน่งรถกำลังอัปเดตแบบเรียลไทม์");
      },
      () => setLocationMessage("ไม่สามารถติดตาม GPS ได้ กรุณาอนุญาตการใช้ตำแหน่ง"),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [authenticated, initialView, orders.length]);

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setAttemptsRemaining(null);
    try {
      const response = await fetch("/api/rider/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as {
        error?: string;
        retryAfterSeconds?: number;
        attemptsRemaining?: number;
      };
      lockout.setLockFromResponse(data.retryAfterSeconds);
      if (typeof data.attemptsRemaining === "number") {
        setAttemptsRemaining(data.attemptsRemaining);
      }
      if (!response.ok) {
        throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      }
      setUsername("");
      setPassword("");
      setAuthenticated(true);
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "เข้าสู่ระบบไม่สำเร็จ",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch("/api/rider/session", { method: "DELETE" });
    setAuthenticated(false);
    setOrders([]);
    setReadyCount(0);
    setDeliveringCount(0);
    setError(null);
  };

  const updateStatus = async (order: RiderOrder) => {
    const nextStatus: DbOrderStatus =
      order.status === "READY_FOR_DELIVERY" ? "DELIVERING" : "COMPLETED";
    if (nextStatus === "COMPLETED" && !order.delivery_proof_url) {
      setError("กรุณาถ่ายหรือเลือกรูปหลักฐานก่อนกดส่งสำเร็จ");
      return;
    }
    setUpdatingId(order.id);
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
      await loadOrders();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "อัปเดตสถานะไม่สำเร็จ",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const uploadDeliveryProof = async (orderId: string) => {
    const file = proofFiles[orderId];
    if (!file) {
      setError("กรุณาถ่ายหรือเลือกรูปหลักฐานก่อนอัปโหลด");
      return;
    }

    setUploadingProofId(orderId);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(`/api/rider/orders/${orderId}/proof`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "อัปโหลดรูปหลักฐานไม่สำเร็จ");
      }
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? { ...order, delivery_proof_url: data.url as string }
            : order,
        ),
      );
      setProofFiles((current) => ({ ...current, [orderId]: null }));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "อัปโหลดรูปหลักฐานไม่สำเร็จ",
      );
    } finally {
      setUploadingProofId(null);
    }
  };

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] px-5 py-10">
        <form
          onSubmit={login}
          className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
        >
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--primary)]">
            FastOrder Rider
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-[var(--text)]">
            งานจัดส่ง
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            สำหรับไรเดอร์เท่านั้น
          </p>
          <label className="mt-6 block text-sm font-semibold text-[var(--text)]">
            ชื่อผู้ใช้
            <input
              type="text"
              required
              disabled={lockout.isLocked}
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-base outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold text-[var(--text)]">
            รหัสผ่าน
            <input
              type="password"
              required
              disabled={lockout.isLocked}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-base outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />
          </label>
          {lockout.isLocked ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
              ล็อกชั่วคราว · ลองใหม่ได้ใน {lockout.countdown}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {attemptsRemaining !== null && !lockout.isLocked ? (
            <p className="mt-2 text-sm font-medium text-amber-800">
              เหลืออีก {attemptsRemaining} ครั้งก่อนล็อก 5 นาที
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting || lockout.isLocked}
            className="mt-5 w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "กำลังตรวจสอบ..." : "เข้าสู่หน้างานจัดส่ง"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface-muted)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--primary)]">
              FastOrder Rider
            </p>
            <h1 className="font-display text-2xl font-bold text-[var(--text)]">
              งานจัดส่งวันนี้
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
          >
            ออกจากระบบ
          </button>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-2 px-5 pb-3" aria-label="เมนูไรเดอร์">
          <Link
            href="/rider"
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              initialView === "jobs"
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            }`}
          >
            รายการงาน
          </Link>
          <Link
            href="/rider/map"
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              initialView === "map"
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            }`}
          >
            แผนที่จัดส่ง
          </Link>
        </nav>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-5 py-5">
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-800">รอรับไปส่ง</p>
            <p className="mt-1 font-display text-3xl font-bold text-amber-950">
              {readyCount}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-xs font-semibold text-sky-800">กำลังจัดส่ง</p>
            <p className="mt-1 font-display text-3xl font-bold text-sky-950">
              {deliveringCount}
            </p>
          </div>
        </section>

        {initialView === "jobs" && orders.length > 0 ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--text)]">แผนที่งานจัดส่ง</p>
                <p className="text-xs text-[var(--text-muted)]">
                  แตะหมุดเพื่อดูรายละเอียดปลายทาง
                </p>
              </div>
              <button
                type="button"
                onClick={updateRiderLocation}
                className="rounded-lg border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-3 py-2 text-xs font-bold text-[var(--primary)]"
              >
                ใช้ GPS
              </button>
            </div>
            {shopLocation ? (
              <RiderDeliveryMap
                shop={shopLocation}
                orders={orders}
                riderLocation={riderLocation}
                compact
              />
            ) : (
              <div className="flex h-72 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-muted)]">
                กำลังโหลดแผนที่...
              </div>
            )}
          </section>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-muted)]">ทั้งหมด {orders.length} ออร์เดอร์</p>
          <button
            type="button"
            onClick={() => void loadOrders()}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--primary)]/40"
            disabled={loading}
          >
            {loading ? "กำลังโหลด..." : "รีเฟรช"}
          </button>
        </div>

        {error ? (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {initialView === "map" ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <div>
                <p className="font-semibold text-[var(--text)]">แผนที่งานจัดส่ง</p>
                <p className="text-xs text-[var(--text-muted)]">
                  สีส้มคือร้าน · สีเหลืองคืองานรอรับ · สีฟ้าคืองานกำลังส่ง
                </p>
              </div>
              <button
                type="button"
                onClick={updateRiderLocation}
                className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-3 py-2 text-xs font-bold text-[var(--primary)] transition hover:brightness-95"
              >
                ใช้ตำแหน่งของฉัน
              </button>
            </div>
            {locationMessage ? (
              <p className="text-xs text-[var(--text-muted)]">{locationMessage}</p>
            ) : null}
            {shopLocation ? (
              <RiderDeliveryMap
                shop={shopLocation}
                orders={orders}
                riderLocation={riderLocation}
              />
            ) : (
              <div className="flex h-[420px] items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-muted)]">
                กำลังโหลดตำแหน่งร้าน...
              </div>
            )}
            {orders.some(
              (order) =>
                order.delivery_latitude === null || order.delivery_longitude === null,
            ) ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                บางออร์เดอร์ไม่มีพิกัด จึงไม่แสดงหมุดบนแผนที่ แต่ยังเปิดนำทางจากหน้ารายการงานได้
              </p>
            ) : null}
          </section>
        ) : null}

        {loading && orders.length === 0 ? (
          <p className="text-center text-sm text-[var(--text-muted)]">
            กำลังโหลดงานจัดส่ง...
          </p>
        ) : null}
        {!loading && orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center">
            <p className="font-semibold text-[var(--text)]">ตอนนี้ยังไม่มีงานจัดส่ง</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              งานที่ร้านเตรียมเสร็จจะแสดงที่นี่
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          {orders.map((order) => {
            const isReady = order.status === "READY_FOR_DELIVERY";
            const mapsUrl =
              order.delivery_latitude !== null && order.delivery_longitude !== null
                ? `https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`;
            const isUpdating = updatingId === order.id;

            return (
              <article
                key={order.id}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-bold text-[var(--text)]">
                      #{order.order_number}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {formatOrderDate(order.created_at)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      isReady ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {isReady ? "พร้อมรับไปส่ง" : "กำลังจัดส่ง"}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4">
                  <p className="font-semibold text-[var(--text)]">{order.customer_name}</p>
                  <a
                    href={`tel:${order.customer_phone}`}
                    className="mt-1 inline-flex text-sm font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
                  >
                    โทร {formatPhoneForDisplay(order.customer_phone)}
                  </a>
                  <p className="mt-3 text-sm leading-6 text-[var(--text)]">
                    {order.delivery_address}
                  </p>
                  {order.distance_meters !== null ? (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      ระยะทางจากร้าน {formatDistance(order.distance_meters)} · ยอด {formatPrice(order.payable_total)}
                    </p>
                  ) : null}
                  {order.customer_note ? (
                    <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-[var(--text-muted)]">
                      หมายเหตุ: {order.customer_note}
                    </p>
                  ) : null}
                </div>

                {!isReady ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-sky-300 bg-sky-50/60 p-4">
                    <p className="text-sm font-bold text-sky-950">หลักฐานการส่ง</p>
                    <p className="mt-1 text-xs text-sky-800">
                      ต้องถ่ายหรือแนบรูปก่อนกดส่งสำเร็จ
                    </p>
                    {order.delivery_proof_url ? (
                      <a
                        href={order.delivery_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-bold text-[var(--primary)] ring-1 ring-sky-200"
                      >
                        ดูรูปหลักฐานที่แนบแล้ว
                      </a>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-800 transition hover:bg-sky-100">
                          ถ่ายรูป / เลือกรูป
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            className="sr-only"
                            onChange={(event) =>
                              setProofFiles((current) => ({
                                ...current,
                                [order.id]: event.target.files?.[0] ?? null,
                              }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          disabled={!proofFiles[order.id] || uploadingProofId === order.id}
                          onClick={() => void uploadDeliveryProof(order.id)}
                          className="rounded-xl bg-sky-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-800 disabled:opacity-50"
                        >
                          {uploadingProofId === order.id
                            ? "กำลังอัปโหลด..."
                            : "อัปโหลดหลักฐาน"}
                        </button>
                        {proofFiles[order.id] ? (
                          <span className="max-w-48 truncate text-xs text-sky-900">
                            {proofFiles[order.id]?.name}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-4 py-3 text-center text-sm font-bold text-[var(--primary)] transition hover:brightness-95"
                  >
                    เปิดแผนที่
                  </a>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => void updateStatus(order)}
                    className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {isUpdating
                      ? "กำลังอัปเดต..."
                      : isReady
                        ? "เริ่มจัดส่ง"
                        : "ส่งสำเร็จ"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
