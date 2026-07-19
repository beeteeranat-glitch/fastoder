"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import { useLoginLockout } from "@/hooks/use-login-lockout";
import { formatDistance } from "@/lib/delivery-fee";
import { formatOrderDate } from "@/lib/orders";
import { ORDERS_REALTIME_SUBS } from "@/lib/realtime-subscriptions";

type RiderOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  delivery_address: string;
  distance_meters: number | null;
  status: "READY_FOR_DELIVERY" | "DELIVERING";
  created_at: string;
};

export function RiderOrdersList({
  initiallyAuthenticated,
  returnToAdmin = false,
}: {
  initiallyAuthenticated: boolean;
  returnToAdmin?: boolean;
}) {
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [readyCount, setReadyCount] = useState(0);
  const [deliveringCount, setDeliveringCount] = useState(0);
  const [loading, setLoading] = useState(initiallyAuthenticated);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const lockout = useLoginLockout("/api/rider/session", !authenticated);

  const loadOrders = useCallback(async () => {
    if (!authenticated) return;
    try {
      const response = await fetch("/api/rider/orders", { cache: "no-store" });
      const data = (await response.json()) as {
        orders?: RiderOrder[];
        readyCount?: number;
        deliveringCount?: number;
        error?: string;
      };
      if (response.status === 401) {
        setAuthenticated(false);
        setOrders([]);
        return;
      }
      if (!response.ok) throw new Error(data.error ?? "โหลดงานจัดส่งไม่สำเร็จ");
      setOrders(data.orders ?? []);
      setReadyCount(data.readyCount ?? 0);
      setDeliveringCount(data.deliveringCount ?? 0);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดงานจัดส่งไม่สำเร็จ");
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
      if (!response.ok) throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      setUsername("");
      setPassword("");
      setAuthenticated(true);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "เข้าสู่ระบบไม่สำเร็จ");
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

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] px-5 py-10">
        <form onSubmit={login} className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--primary)]">FastOrder Rider</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-[var(--text)]">งานจัดส่ง</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">สำหรับไรเดอร์เท่านั้น</p>
          <label className="mt-6 block text-sm font-semibold text-[var(--text)]">
            ชื่อผู้ใช้
            <input type="text" required disabled={lockout.isLocked} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:cursor-not-allowed disabled:opacity-60" />
          </label>
          <label className="mt-4 block text-sm font-semibold text-[var(--text)]">
            รหัสผ่าน
            <input type="password" required disabled={lockout.isLocked} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:cursor-not-allowed disabled:opacity-60" />
          </label>
          {lockout.isLocked ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">ล็อกชั่วคราว · ลองใหม่ได้ใน {lockout.countdown}</p> : null}
          {error ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {attemptsRemaining !== null && !lockout.isLocked ? <p className="mt-2 text-sm font-medium text-amber-800">เหลืออีก {attemptsRemaining} ครั้งก่อนล็อก 5 นาที</p> : null}
          <button type="submit" disabled={submitting || lockout.isLocked} className="mt-5 w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
            {submitting ? "กำลังตรวจสอบ..." : "เข้าสู่หน้างานจัดส่ง"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface-muted)] pb-12">
      <header className="border-b border-slate-900 bg-[var(--text)] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl ring-1 ring-white/15">🛵</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-200">FastOrder Rider</p>
              <h1 className="font-display text-2xl font-bold text-white">งานจัดส่งวันนี้</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {returnToAdmin ? (
              <Link href="/admin/orders" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                ← กลับแอดมิน
              </Link>
            ) : null}
            <button type="button" onClick={() => void logout()} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">ออกจากระบบ</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-5 py-6 sm:px-6">
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2 text-amber-800"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-sm">●</span><p className="text-sm font-semibold">รอรับไปส่ง</p></div>
              <p className="mt-2 font-display text-4xl font-bold tracking-tight text-amber-950">{readyCount}</p>
              <p className="mt-1 text-xs text-amber-800">งานที่พร้อมออกจากร้าน</p>
            </div>
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sky-800"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sm">↗</span><p className="text-sm font-semibold">กำลังจัดส่ง</p></div>
              <p className="mt-2 font-display text-4xl font-bold tracking-tight text-sky-950">{deliveringCount}</p>
              <p className="mt-1 text-xs text-sky-800">งานที่อยู่ระหว่างนำส่ง</p>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--text)]">งานของฉัน</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{orders.length} ออร์เดอร์ · กดเพื่อเปิดแผนที่และดำเนินการ</p>
          </div>
          <button type="button" onClick={() => void loadOrders()} disabled={loading} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--primary)]/45 hover:text-[var(--primary)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">{loading ? "กำลังโหลด..." : "↻ รีเฟรช"}</button>
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {loading && orders.length === 0 ? <p className="text-center text-sm text-[var(--text-muted)]">กำลังโหลดงานจัดส่ง...</p> : null}
        {!loading && orders.length === 0 ? <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center"><p className="font-semibold text-[var(--text)]">ตอนนี้ยังไม่มีงานจัดส่ง</p><p className="mt-1 text-sm text-[var(--text-muted)]">งานที่ร้านเตรียมเสร็จจะแสดงที่นี่</p></div> : null}

        <div className="grid gap-3 lg:grid-cols-2">
          {orders.map((order) => {
            const isReady = order.status === "READY_FOR_DELIVERY";
            return (
              <Link key={order.id} href={`/rider/orders/${order.id}${returnToAdmin ? "?from=admin" : ""}`} className="group block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition duration-200 ease-out hover:-translate-y-px hover:border-[var(--primary)]/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-bold text-[var(--text)]">#{order.order_number}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{formatOrderDate(order.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${isReady ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"}`}>{isReady ? "พร้อมรับไปส่ง" : "กำลังจัดส่ง"}</span>
                </div>
                <div className="mt-4 border-t border-[var(--border)] pt-4">
                  <p className="font-semibold text-[var(--text)]">{order.customer_name}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">📍 {order.delivery_address}</p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs"><span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1.5 font-semibold text-[var(--text-muted)]">{order.distance_meters !== null ? `ระยะทาง ${formatDistance(order.distance_meters)}` : "รอตรวจสอบพิกัด"}</span><span className="font-bold text-[var(--primary)] transition group-hover:translate-x-0.5">เปิดงาน →</span></div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
