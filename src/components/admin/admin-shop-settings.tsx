"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { AdminQrGenerator } from "@/components/admin/admin-qr-generator";
import type { ShopProfile } from "@/lib/restaurant-data";

const WEEKDAYS = [
  { value: 1, label: "จันทร์" },
  { value: 2, label: "อังคาร" },
  { value: 3, label: "พุธ" },
  { value: 4, label: "พฤหัส" },
  { value: 5, label: "ศุกร์" },
  { value: 6, label: "เสาร์" },
  { value: 0, label: "อาทิตย์" },
];

function digitsOnly(value: string) {
  return value.replace(/[^\d.]/g, "");
}

function parseCoord(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`กรอก${label}`);
  const num = Number(normalized);
  if (!Number.isFinite(num)) throw new Error(`${label}ไม่ถูกต้อง`);
  return num;
}

export function AdminShopSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [openDays, setOpenDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [closeMinutes, setCloseMinutes] = useState("30");

  const loadShop = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/restaurant", { cache: "no-store" });
      const data = (await res.json()) as { shop?: ShopProfile; error?: string };
      if (!res.ok || !data.shop) {
        throw new Error(data.error ?? "โหลดไม่สำเร็จ");
      }
      setName(data.shop.name);
      setAddress(data.shop.address);
      setLatitude(String(data.shop.latitude));
      setLongitude(String(data.shop.longitude));
      setLogoUrl(data.shop.logoUrl);
      setBankName(data.shop.bankName ?? "");
      setBankAccountNumber(data.shop.bankAccountNumber ?? "");
      setBankAccountName(data.shop.bankAccountName ?? "");
      setPaymentQrUrl(data.shop.paymentQrUrl);
      setIsOpen(data.shop.isManuallyOpen ?? data.shop.isOpen);
      setOpenDays(data.shop.openDays);
      if (data.shop.closingUntil) {
        const remaining = Math.max(
          1,
          Math.ceil(
            (new Date(data.shop.closingUntil).getTime() - Date.now()) /
              60000,
          ),
        );
        setCloseMinutes(String(remaining));
      } else {
        setCloseMinutes("30");
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShop();
  }, [loadShop]);

  const save = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const minutes = Math.max(0, Math.round(Number(closeMinutes) || 0));
      const closingUntil = !isOpen && minutes > 0
        ? new Date(Date.now() + minutes * 60000).toISOString()
        : null;

      const res = await fetch("/api/admin/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address,
          latitude: parseCoord(latitude, "ละติจูด"),
          longitude: parseCoord(longitude, "ลองจิจูด"),
          is_open: isOpen,
          closing_until: closingUntil,
          open_days: openDays,
          logo_url: logoUrl,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_name: bankAccountName,
          payment_qr_url: paymentQrUrl,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("fastorder-shop-updates");
        channel.postMessage({ type: "updated", at: Date.now() });
        channel.close();
      }
      setSuccess("บันทึกข้อมูลร้านแล้ว");
      await loadShop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">กำลังโหลด...</p>;
  }

  return (
    <div className="space-y-4">
      <AdminQrGenerator />


      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <ImageUploadField
          label="โลโก้ร้าน"
          imageUrl={logoUrl}
          emoji="🏪"
          gradient="from-sky-400 to-blue-500"
          alt={name || "โลโก้ร้าน"}
          onChange={setLogoUrl}
        />
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-lg font-bold text-[var(--text)]">
          ข้อมูลร้าน
        </h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
              ชื่อร้าน
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
              ที่อยู่ร้าน
            </span>
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={3}
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                ละติจูด (พิกัดร้าน)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={latitude}
                onChange={(event) =>
                  setLatitude(digitsOnly(event.target.value))
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm tabular-nums"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                ลองจิจูด (พิกัดร้าน)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={longitude}
                onChange={(event) =>
                  setLongitude(digitsOnly(event.target.value))
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm tabular-nums"
              />
            </label>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            พิกัดใช้คำนวณระยะจัดส่ง — ถ้าเปลี่ยนที่อยู่ควรอัปเดตพิกัดให้ตรงด้วย
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-lg font-bold text-[var(--text)]">
          สถานะร้าน
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          เลือกสถานะว่าให้ลูกค้าเห็นร้านเปิดหรือปิดรับออเดอร์
        </p>
        <div className="mt-4 space-y-3">
          <label className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm transition hover:border-[var(--primary)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">
                  {isOpen ? "เปิดรับออเดอร์" : "ปิดรับออเดอร์"}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {isOpen
                    ? "ลูกค้าจะเห็นว่าร้านเปิดรับออเดอร์"
                    : "ลูกค้าจะเห็นว่าร้านปิดรับออเดอร์"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                className={`relative inline-flex h-9 w-16 flex-shrink-0 items-center rounded-full p-1 transition ${
                  isOpen ? "bg-emerald-500/20" : "bg-rose-500/20"
                }`}
                aria-label={isOpen ? "ปิดรับออเดอร์" : "เปิดรับออเดอร์"}
              >
                <span
                  className={`inline-block h-7 w-7 rounded-full bg-white shadow transition ${
                    isOpen ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {!isOpen ? (
              <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
                <label className="flex items-center gap-3 text-sm font-semibold text-[var(--text)]">
                  ปิดชั่วคราวเป็นเวลา
                  <input
                    type="text"
                    value={closeMinutes}
                    onChange={(event) =>
                      setCloseMinutes(digitsOnly(event.target.value))
                    }
                    className="w-20 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-right tabular-nums"
                  />
                  นาที
                </label>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  ใส่ 0 ถ้าต้องการปิดจนกว่าจะเปิดเอง
                </p>
              </div>
            ) : null}
          </label>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">
                  วันเปิดร้าน
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  ถ้าวันนี้ไม่ได้เลือก ลูกค้าจะเห็นร้านปิดและสั่งซื้อไม่ได้
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenDays([0, 1, 2, 3, 4, 5, 6])}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)]"
              >
                เปิดทุกวัน
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {WEEKDAYS.map((day) => {
                const checked = openDays.includes(day.value);
                return (
                  <label
                    key={day.value}
                    className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      checked
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setOpenDays((current) => {
                          if (event.target.checked) {
                            return Array.from(new Set([...current, day.value])).sort(
                              (a, b) => a - b,
                            );
                          }
                          const next = current.filter((value) => value !== day.value);
                          return next.length > 0 ? next : current;
                        });
                      }}
                      className="sr-only"
                    />
                    {day.label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-display text-lg font-bold text-[var(--text)]">
          การชำระเงิน (โอนเงิน)
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          แสดงเมื่อลูกค้าเลือกชำระด้วยการโอนเงินในหน้า Checkout
        </p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
              ธนาคาร
            </span>
            <input
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              placeholder="เช่น กสิกรไทย"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
              เลขบัญชี
            </span>
            <input
              value={bankAccountNumber}
              onChange={(event) => setBankAccountNumber(event.target.value)}
              placeholder="เช่น 123-4-56789-0"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm tabular-nums"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
              ชื่อบัญชี
            </span>
            <input
              value={bankAccountName}
              onChange={(event) => setBankAccountName(event.target.value)}
              placeholder="ชื่อเจ้าของบัญชี"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
            />
          </label>
          <ImageUploadField
            label="QR Code รับเงิน (PromptPay / ธนาคาร)"
            imageUrl={paymentQrUrl}
            emoji="📱"
            gradient="from-emerald-400 to-teal-500"
            alt="QR Code รับเงิน"
            onChange={setPaymentQrUrl}
          />
        </div>
      </section>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลร้าน"}
      </button>
    </div>
  );
}
