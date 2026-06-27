"use client";

import { ToggleSwitch } from "@/components/admin/toggle-switch";
import { useCallback, useEffect, useState } from "react";
import {
  formatPromoDiscount,
  getPromoStatus,
  getPromoStatusLabel,
  PROMO_DISCOUNT_TYPE_OPTIONS,
  type PromoCodeRecord,
} from "@/lib/promo-data";
import type { PromoDiscountType } from "@/types/database";

type PromoDraft = {
  id?: string;
  code: string;
  label: string;
  discount_type: PromoDiscountType;
  discount_value: number;
  min_order_amount: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  max_uses: string;
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function emptyDraft(): PromoDraft {
  return {
    code: "",
    label: "",
    discount_type: "percent_food",
    discount_value: 10,
    min_order_amount: 0,
    starts_at: "",
    ends_at: "",
    is_active: true,
    max_uses: "",
  };
}

function draftFromPromo(promo: PromoCodeRecord): PromoDraft {
  return {
    id: promo.id,
    code: promo.code,
    label: promo.label,
    discount_type: promo.discountType,
    discount_value: promo.discountValue,
    min_order_amount: promo.minOrderAmount,
    starts_at: toLocalInput(promo.startsAt),
    ends_at: toLocalInput(promo.endsAt),
    is_active: promo.isActive,
    max_uses: promo.maxUses === null ? "" : String(promo.maxUses),
  };
}

function statusTone(status: ReturnType<typeof getPromoStatus>) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "scheduled":
      return "bg-sky-100 text-sky-700";
    case "expired":
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
    case "sold_out":
      return "bg-amber-100 text-amber-700";
    case "inactive":
      return "bg-rose-100 text-rose-700";
  }
}

export function AdminPromosBoard() {
  const [promos, setPromos] = useState<PromoCodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PromoDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadPromos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/promos", { cache: "no-store" });
      const data = (await res.json()) as {
        promos?: PromoCodeRecord[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "โหลดไม่สำเร็จ");
      setPromos(data.promos ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPromos();
  }, [loadPromos]);

  const savePromo = async () => {
    if (!editing) return;
    if (!editing.code.trim() || !editing.label.trim()) {
      setError("กรอกโค้ดและชื่อโปรโมชั่น");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: editing.code,
        label: editing.label,
        discount_type: editing.discount_type,
        discount_value:
          editing.discount_type === "free_delivery"
            ? 0
            : editing.discount_value,
        min_order_amount: editing.min_order_amount,
        starts_at: fromLocalInput(editing.starts_at),
        ends_at: fromLocalInput(editing.ends_at),
        is_active: editing.is_active,
        max_uses: editing.max_uses ? Number(editing.max_uses) : null,
      };

      const isNew = !editing.id;
      const res = await fetch(
        isNew ? "/api/admin/promos" : `/api/admin/promos/${editing.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      setEditing(null);
      await loadPromos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const deletePromo = async (id: string) => {
    if (!confirm("ลบโค้ดนี้?")) return;
    const res = await fetch(`/api/admin/promos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("ลบไม่สำเร็จ");
      return;
    }
    await loadPromos();
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => {
        setCopiedCode((current) => (current === code ? null : current));
      }, 2000);
    } catch {
      setError("คัดลอกไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-muted)]">
          จัดการโค้ดลด กำหนดเวลาโปรโมชั่น เปอร์เซ็นต์ลด และจำนวนตั๋ว
        </p>
        <button
          type="button"
          onClick={() => setEditing(emptyDraft())}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          + เพิ่มโค้ดลด
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">กำลังโหลด...</p>
      ) : error && !editing ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : promos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] px-6 py-12 text-center text-sm text-[var(--text-muted)]">
          ยังไม่มีโค้ดลด
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map((promo) => {
            const status = getPromoStatus(promo);
            const remaining =
              promo.maxUses === null
                ? "ไม่จำกัด"
                : `${Math.max(0, promo.maxUses - promo.usedCount)} / ${promo.maxUses}`;
            return (
              <article
                key={promo.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-bold text-[var(--text)]">
                        {promo.code}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(status)}`}
                      >
                        {getPromoStatusLabel(status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text)]">
                      {promo.label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {formatPromoDiscount(promo)} · ใช้แล้ว {promo.usedCount}{" "}
                      · เหลือ {remaining}
                    </p>
                    {promo.startsAt || promo.endsAt ? (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {promo.startsAt
                          ? new Date(promo.startsAt).toLocaleString("th-TH")
                          : "เริ่มทันที"}
                        {" – "}
                        {promo.endsAt
                          ? new Date(promo.endsAt).toLocaleString("th-TH")
                          : "ไม่กำหนดสิ้นสุด"}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyCode(promo.code)}
                      className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
                    >
                      {copiedCode === promo.code ? "คัดลอกแล้ว ✓" : "คัดลอก"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(draftFromPromo(promo))}
                      className="rounded-xl bg-[var(--primary-soft)] px-3 py-2 text-sm font-semibold text-[var(--primary)]"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => void deletePromo(promo.id)}
                      className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)]"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--surface)] p-5 shadow-xl">
            <h2 className="font-display text-xl font-bold text-[var(--text)]">
              {editing.id ? "แก้ไขโค้ดลด" : "เพิ่มโค้ดลด"}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                  โค้ด
                </span>
                <input
                  value={editing.code}
                  onChange={(event) =>
                    setEditing({ ...editing, code: event.target.value.toUpperCase() })
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm uppercase"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                  ชื่อโปรโมชั่น
                </span>
                <input
                  value={editing.label}
                  onChange={(event) =>
                    setEditing({ ...editing, label: event.target.value })
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                  ประเภทส่วนลด
                </span>
                <select
                  value={editing.discount_type}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      discount_type: event.target.value as PromoDiscountType,
                    })
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
                >
                  {PROMO_DISCOUNT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {editing.discount_type !== "free_delivery" ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                    {editing.discount_type === "percent_food"
                      ? "เปอร์เซ็นต์ลดค่าเครื่องดื่ม"
                      : "จำนวนเงินที่ลด (บาท)"}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={editing.discount_type === "percent_food" ? 100 : undefined}
                    value={editing.discount_value}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        discount_value: Number(event.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
                  />
                </label>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                    เริ่มโปรโมชั่น
                  </span>
                  <input
                    type="datetime-local"
                    value={editing.starts_at}
                    onChange={(event) =>
                      setEditing({ ...editing, starts_at: event.target.value })
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                    สิ้นสุดโปรโมชั่น
                  </span>
                  <input
                    type="datetime-local"
                    value={editing.ends_at}
                    onChange={(event) =>
                      setEditing({ ...editing, ends_at: event.target.value })
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                  จำนวนตั๋วลด (เว้นว่าง = ไม่จำกัด)
                </span>
                <input
                  type="number"
                  min={1}
                  value={editing.max_uses}
                  onChange={(event) =>
                    setEditing({ ...editing, max_uses: event.target.value })
                  }
                  placeholder="เช่น 100"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
                />
              </label>
              <ToggleSwitch
                label="สถานะโปรโมชั่น"
                checked={editing.is_active}
                onLabel="เปิดใช้งาน"
                offLabel="ปิดใช้งาน"
                onChange={(is_active) => setEditing({ ...editing, is_active })}
              />
            </div>
            {error ? (
              <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setError(null);
                }}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void savePromo()}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
