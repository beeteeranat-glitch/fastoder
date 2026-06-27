"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import { formatPrice } from "@/lib/format";
import { formatDistance } from "@/lib/delivery-fee";
import { formatPhoneForDisplay } from "@/lib/phone";
import {
  STATUS_ACTION_LABELS,
  canAdminActOnOrder,
  formatOrderDate,
  getNextAdminStatus,
  paymentMethodLabel,
} from "@/lib/orders";
import { ORDERS_REALTIME_SUBS } from "@/lib/realtime-subscriptions";
import type { DbOrder, DbOrderStatus } from "@/types/database";

type FilterValue = "active" | "all" | DbOrderStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "active", label: "รอดำเนินการ" },
  { value: "PENDING", label: "รอร้าน" },
  { value: "COMPLETED", label: "รับแล้ว" },
  { value: "CANCELLED", label: "ยกเลิก" },
  { value: "all", label: "ทั้งหมด" },
];

const PAGE_SIZE = 20;

export function AdminOrdersBoard() {
  const [filter, setFilter] = useState<FilterValue>("active");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (searchQuery) params.set("q", searchQuery);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = (await res.json()) as {
        orders?: DbOrder[];
        total?: number;
        totalPages?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "โหลดไม่สำเร็จ");
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery, page]);

  useEffect(() => {
    setLoading(true);
    void loadOrders();
  }, [loadOrders]);

  useRealtimeRefetch(ORDERS_REALTIME_SUBS, loadOrders);

  const updateStatus = async (orderId: string, status: DbOrderStatus) => {
    setUpdatingId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "อัปเดตไม่สำเร็จ");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="ค้นหาเลขออเดอร์, ชื่อ, เบอร์, ที่อยู่..."
          className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          ค้นหา
        </button>
        {searchQuery ? (
          <button
            type="button"
            onClick={clearSearch}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-muted)]"
          >
            ล้าง
          </button>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setFilter(item.value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === item.value
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--surface)] text-[var(--text-muted)] ring-1 ring-[var(--border)] hover:text-[var(--text)]"
              }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">กำลังโหลด...</p>
      ) : error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            {searchQuery ? "ไม่พบออเดอร์ที่ค้นหา" : "ยังไม่มีออเดอร์"}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--text-muted)]">
            ทั้งหมด {total} รายการ
            {searchQuery ? ` · ค้นหา "${searchQuery}"` : ""}
          </p>
          <div className="space-y-3">
            {orders.map((order) => {
              const canAct = canAdminActOnOrder(order.status);
              const nextStatus = getNextAdminStatus(order.status);
              const busy = updatingId === order.id;

              return (
                <article
                  key={order.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="block transition hover:opacity-90"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-lg font-bold text-[var(--text)]">
                        #{order.order_number}
                      </p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm text-[var(--text)]">
                      {order.customer_name} ·{" "}
                      {formatPhoneForDisplay(order.customer_phone)}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)]">
                      {order.delivery_address}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-[var(--text-muted)]">
                        {formatOrderDate(order.created_at)} ·{" "}
                        {paymentMethodLabel(order.payment_method)}
                        {order.distance_meters !== null
                          ? ` · ${formatDistance(order.distance_meters)}`
                          : ""}
                      </span>
                      <span className="font-display font-bold text-[var(--text)]">
                        {formatPrice(order.payable_total)}
                      </span>
                    </div>
                  </Link>

                  {order.status === "PENDING" ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateStatus(order.id, "CONFIRMED")}
                        className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        {busy ? "กำลังอัปเดต..." : "ยืนยันออเดอร์"}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateStatus(order.id, "CANCELLED")}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        {busy ? "กำลังอัปเดต..." : "ยกเลิกออเดอร์"}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                ← ก่อนหน้า
              </button>
              <span className="text-sm text-[var(--text-muted)]">
                หน้า {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                ถัดไป →
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
