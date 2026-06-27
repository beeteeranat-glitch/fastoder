"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { AdminQrGenerator } from "@/components/admin/admin-qr-generator";
import type { ShopProfile } from "@/lib/restaurant-data";

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
      const res = await fetch("/api/admin/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address,
          latitude: parseCoord(latitude, "ละติจูด"),
          longitude: parseCoord(longitude, "ลองจิจูด"),
          logo_url: logoUrl,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_name: bankAccountName,
          payment_qr_url: paymentQrUrl,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
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
