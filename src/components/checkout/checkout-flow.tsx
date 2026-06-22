"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RESTAURANT } from "@/data/menu";
import { useCart } from "@/context/cart-context";
import {
  calcCartTotal,
  calcDistanceMeters,
  formatPrice,
} from "@/lib/format";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { formatDeliveryAddress } from "@/lib/format-address";
import {
  calcDeliveryFee,
  DELIVERY_MAX_KM,
  formatDistance,
  getDeliveryFeeLabel,
  isDeliverable,
} from "@/lib/delivery-fee";
import {
  calcOrderDiscounts,
  lookupPromo,
  lookupReferrer,
  type PromoDefinition,
  type ReferrerDefinition,
} from "@/lib/promotions";

const LocationMapPicker = dynamic(
  () =>
    import("@/components/checkout/location-map-picker").then(
      (module) => module.LocationMapPicker,
    ),
  { ssr: false },
);

type LocationState = "idle" | "loading" | "ready" | "denied";

type CustomerLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  areaAddress: string | null;
  streetLine: string | null;
  houseNumber: string | null;
  source: "gps" | "map";
};

const BANK_ACCOUNT = {
  bank: "กสิกรไทย",
  accountNumber: "123-4-56789-0",
  accountName: "สมูทตี้สดใส",
};

const ACCEPTED_SLIP_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function CheckoutFlow() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const total = calcCartTotal(items);

  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">(
    "cash",
  );
  const [customerLocation, setCustomerLocation] =
    useState<CustomerLocation | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressDetail, setAddressDetail] = useState("");
  const [streetDetail, setStreetDetail] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoDefinition | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [referrerInput, setReferrerInput] = useState("");
  const [appliedReferrer, setAppliedReferrer] =
    useState<ReferrerDefinition | null>(null);
  const [referrerError, setReferrerError] = useState<string | null>(null);
  const slipInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!slipFile) {
      setSlipPreview(null);
      return;
    }
    const url = URL.createObjectURL(slipFile);
    setSlipPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [slipFile]);

  const distance = useMemo(() => {
    if (!customerLocation) return null;
    return calcDistanceMeters(
      RESTAURANT.latitude,
      RESTAURANT.longitude,
      customerLocation.latitude,
      customerLocation.longitude,
    );
  }, [customerLocation]);

  const inRange = distance !== null && isDeliverable(distance);

  const deliveryFee =
    distance !== null ? calcDeliveryFee(distance) : null;

  const discounts = useMemo(
    () =>
      calcOrderDiscounts({
        foodTotal: total,
        deliveryFee,
        promo: appliedPromo,
      }),
    [total, deliveryFee, appliedPromo],
  );

  const subtotal =
    deliveryFee !== null ? total + deliveryFee : total;

  const payableTotal = Math.max(0, subtotal - discounts.totalDiscount);

  const deliveryAddress = useMemo(() => {
    if (!customerLocation?.areaAddress) return null;
    return formatDeliveryAddress({
      houseDetail: addressDetail,
      streetLine: streetDetail,
      areaAddress: customerLocation.areaAddress,
      geocodedHouseNumber: customerLocation.houseNumber,
    });
  }, [addressDetail, streetDetail, customerLocation]);

  const resolveAddress = async (latitude: number, longitude: number) => {
    setAddressLoading(true);
    try {
      const result = await reverseGeocode(latitude, longitude);
      setCustomerLocation((current) =>
        current &&
        current.latitude === latitude &&
        current.longitude === longitude
          ? {
              ...current,
              areaAddress: result?.areaAddress ?? null,
              streetLine: result?.streetLine ?? null,
              houseNumber: result?.houseNumber ?? null,
            }
          : current,
      );
      if (result?.streetLine) {
        setStreetDetail(result.streetLine);
      }
      if (result?.houseNumber) {
        setAddressDetail(result.houseNumber);
      }
    } finally {
      setAddressLoading(false);
    }
  };

  const applyLocation = (
    latitude: number,
    longitude: number,
    source: CustomerLocation["source"],
    accuracy = 0,
    resetAddressDetail = false,
  ) => {
    setLocationError(null);
    if (resetAddressDetail) {
      setAddressDetail("");
      setStreetDetail("");
    }

    setCustomerLocation({
      latitude,
      longitude,
      accuracy,
      areaAddress: null,
      streetLine: null,
      houseNumber: null,
      source,
    });
    setLocationState("ready");
    void resolveAddress(latitude, longitude);
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setLocationState("denied");
      setLocationError("เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง");
      return;
    }

    setLocationState("loading");
    setLocationError(null);
    setAddressDetail("");
    setStreetDetail("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        applyLocation(
          latitude,
          longitude,
          "gps",
          Math.round(accuracy),
          false,
        );
      },
      (error) => {
        setCustomerLocation(null);
        setLocationState("denied");
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์");
        } else if (error.code === error.TIMEOUT) {
          setLocationError("หมดเวลาในการดึงตำแหน่ง กรุณาลองอีกครั้ง");
        } else {
          setLocationError("ไม่สามารถดึงตำแหน่งได้ กรุณาลองอีกครั้ง");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 60_000,
      },
    );
  };

  const handlePaymentChange = (method: "cash" | "transfer") => {
    setPaymentMethod(method);
    if (method === "cash") {
      setSlipFile(null);
      setSlipError(null);
      if (slipInputRef.current) slipInputRef.current.value = "";
    }
  };

  const handleSlipChange = (file: File | null) => {
    if (!file) return;

    if (!ACCEPTED_SLIP_TYPES.includes(file.type)) {
      setSlipError("รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSlipError("ไฟล์ต้องไม่เกิน 5 MB");
      return;
    }

    setSlipFile(file);
    setSlipError(null);
  };

  const removeSlip = () => {
    setSlipFile(null);
    setSlipError(null);
    if (slipInputRef.current) slipInputRef.current.value = "";
  };

  const applyPromoCode = () => {
    const promo = lookupPromo(promoInput);
    if (!promo) {
      setAppliedPromo(null);
      setPromoError("โค้ดโปรโมชั่นไม่ถูกต้อง");
      return;
    }
    setAppliedPromo(promo);
    setPromoError(null);
  };

  const clearPromoCode = () => {
    setPromoInput("");
    setAppliedPromo(null);
    setPromoError(null);
  };

  const applyReferrerCode = () => {
    const referrer = lookupReferrer(referrerInput);
    if (!referrer) {
      setAppliedReferrer(null);
      setReferrerError("ไม่พบรหัสคนแนะนำ ลอง REF-AOM หรือเบอร์โทร");
      return;
    }
    setAppliedReferrer(referrer);
    setReferrerError(null);
  };

  const clearReferrerCode = () => {
    setReferrerInput("");
    setAppliedReferrer(null);
    setReferrerError(null);
  };

  const canSubmit =
    Boolean(
      customerName &&
        customerPhone &&
        customerLocation &&
        addressDetail.trim() &&
        deliveryAddress &&
        inRange,
    ) && (paymentMethod === "cash" || Boolean(slipFile));

  const handleSubmit = () => {
    if (!canSubmit) return;
    clearCart();
    router.push("/menu");
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          ไม่มีรายการในตะกร้า กรุณาเลือกเมนูก่อน
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="font-display text-lg font-bold text-[var(--text)]">
          ข้อมูลลูกค้า
        </h2>
        <div className="mt-3 space-y-3">
          <Field
            label="ชื่อ"
            value={customerName}
            onChange={setCustomerName}
            placeholder="ชื่อสำหรับจัดส่ง"
          />
          <Field
            label="เบอร์โทร"
            value={customerPhone}
            onChange={setCustomerPhone}
            placeholder="08x-xxx-xxxx"
          />
          <Field
            label="หมายเหตุ"
            value={note}
            onChange={setNote}
            placeholder="เช่น ไม่ใส่น้ำตาล"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="font-display text-lg font-bold text-[var(--text)]">
          ตำแหน่งจัดส่ง
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          จัดส่งได้ในระยะ 1–{DELIVERY_MAX_KM} กม. ค่าส่งคิดตามระยะทาง
        </p>

        <div className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            ร้าน
          </p>
          <p className="mt-1 font-semibold text-[var(--text)]">
            {RESTAURANT.name}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {RESTAURANT.address}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={shareLocation}
            disabled={locationState === "loading"}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--primary)] bg-[var(--primary)]/10 px-4 py-3 text-sm font-bold text-[var(--primary)] disabled:opacity-60"
          >
            {locationState === "loading"
              ? "กำลังดึงตำแหน่ง..."
              : "📍 ใช้ GPS ปัจจุบัน"}
          </button>
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-bold text-[var(--text)]"
          >
            🗺️ เลือกบนแผนที่
          </button>
        </div>

        <LocationMapPicker
          open={mapOpen}
          onClose={() => setMapOpen(false)}
          onConfirm={(latitude, longitude) =>
            applyLocation(latitude, longitude, "map", 0, true)
          }
          restaurant={{
            name: RESTAURANT.name,
            latitude: RESTAURANT.latitude,
            longitude: RESTAURANT.longitude,
          }}
          initialPosition={
            customerLocation
              ? {
                  latitude: customerLocation.latitude,
                  longitude: customerLocation.longitude,
                }
              : null
          }
        />

        {locationState === "ready" && customerLocation ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]">
              <p className="font-semibold text-[var(--text)]">พื้นที่จัดส่ง</p>
              <p className="mt-1 text-[var(--text)]">
                {addressLoading
                  ? "กำลังค้นหาที่อยู่..."
                  : customerLocation.areaAddress ??
                    "ไม่พบที่อยู่จากตำแหน่งนี้"}
              </p>
              <p className="mt-1 text-xs">
                {customerLocation.source === "gps"
                  ? `GPS ชี้พื้นที่โดยประมาณ ±${customerLocation.accuracy} เมตร`
                  : "เลือกจากแผนที่แล้ว — รายละเอียดจะเติมให้อัตโนมัติถ้ามีในข้อมูล"}
                {" "}
                บ้านเลขที่มักต้องกรอกเองเพราะแผนที่ไม่ละเอียดถึงหลังบ้าน
              </p>
              {customerLocation.source === "map" ? (
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  className="mt-2 text-xs font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
                >
                  แก้ไขจุดบนแผนที่
                </button>
              ) : null}
            </div>

            <Field
              label="เพิ่มเติมให้คนไปส่ง (รายละเอียด)"
              value={streetDetail}
              onChange={setStreetDetail}
              placeholder="เช่น ซอย 3 ปากซอยร้านป้าแดง ตึกสีขาว"
            />
            <Field
              label="บ้านเลขที่ / อาคาร / ชั้น"
              value={addressDetail}
              onChange={setAddressDetail}
              placeholder="เช่น 88/12 ชั้น 3"
            />

            {deliveryAddress && addressDetail.trim() ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
                <p className="text-xs font-semibold text-[var(--text-muted)]">
                  ที่อยู่จัดส่ง
                </p>
                <p className="mt-1 font-medium text-[var(--text)]">
                  {deliveryAddress}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {locationError ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {locationError}
          </p>
        ) : null}

        {distance !== null ? (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${
              inRange
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {inRange && deliveryFee !== null ? (
              <>
                ✓ ระยะทาง {formatDistance(distance)}
                {getDeliveryFeeLabel(distance)
                  ? ` (${getDeliveryFeeLabel(distance)})`
                  : ""}{" "}
                — ค่าส่ง {formatPrice(deliveryFee)}
              </>
            ) : (
              `✕ ระยะทาง ${formatDistance(distance)} — จัดส่งได้สูงสุด ${DELIVERY_MAX_KM} กม.`
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:col-span-2">
        <h2 className="font-display text-lg font-bold text-[var(--text)]">
          โปรโมชั่น & คนแนะนำ
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          ใส่โค้ดส่วนลดได้ทันที — คนแนะนำจะได้รับส่วนลดในออเดอร์ถัดไป
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <CodeField
              label="โค้ดโปรโมชั่น"
              value={promoInput}
              onChange={(value) => {
                setPromoInput(value);
                setPromoError(null);
              }}
              placeholder="เช่น SMOOTHIE10, SAVE20"
              onApply={applyPromoCode}
              onClear={appliedPromo ? clearPromoCode : undefined}
              applyLabel={appliedPromo ? "เปลี่ยน" : "ใช้โค้ด"}
              disabled={Boolean(appliedPromo)}
            />
            {promoError ? (
              <p className="text-xs font-medium text-rose-600">{promoError}</p>
            ) : null}
            {appliedPromo ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                ✓ ใช้โค้ด {appliedPromo.code} — {appliedPromo.label}
              </p>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                ทดลอง: SMOOTHIE10, SAVE20, FREESHIP
              </p>
            )}
          </div>

          <div className="space-y-2">
            <CodeField
              label="รหัสคนแนะนำ (ไม่บังคับ)"
              value={referrerInput}
              onChange={(value) => {
                setReferrerInput(value);
                setReferrerError(null);
              }}
              placeholder="รหัสหรือเบอร์คนแนะนำ"
              onApply={applyReferrerCode}
              onClear={appliedReferrer ? clearReferrerCode : undefined}
              applyLabel={appliedReferrer ? "เปลี่ยน" : "ยืนยัน"}
              disabled={Boolean(appliedReferrer)}
            />
            {referrerError ? (
              <p className="text-xs font-medium text-rose-600">{referrerError}</p>
            ) : null}
            {appliedReferrer ? (
              <p className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                ✓ คุณ{appliedReferrer.name} จะได้รับส่วนลด{" "}
                {formatPrice(appliedReferrer.rewardAmount)} ในออเดอร์ถัดไป
              </p>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                ทดลอง: REF-AOM, REF-BEW, 0812345678
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="font-display text-lg font-bold text-[var(--text)]">
          ชำระเงิน
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <PaymentChip
            label="เงินสด"
            active={paymentMethod === "cash"}
            onClick={() => handlePaymentChange("cash")}
          />
          <PaymentChip
            label="โอนเงิน"
            active={paymentMethod === "transfer"}
            onClick={() => handlePaymentChange("transfer")}
          />
        </div>

        {paymentMethod === "transfer" ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                บัญชีรับโอน
              </p>
              <p className="mt-2 font-semibold text-[var(--text)]">
                {BANK_ACCOUNT.bank}
              </p>
              <p className="mt-1 font-display text-xl font-bold tracking-wide text-[var(--primary)]">
                {BANK_ACCOUNT.accountNumber}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {BANK_ACCOUNT.accountName}
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--text)]">
                ยอดโอน: {formatPrice(payableTotal)}
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-[var(--text)]">
                แนบสลิปการโอน
              </p>
              <input
                ref={slipInputRef}
                type="file"
                accept={ACCEPTED_SLIP_TYPES.join(",")}
                className="hidden"
                onChange={(event) =>
                  handleSlipChange(event.target.files?.[0] ?? null)
                }
              />

              {!slipPreview ? (
                <button
                  type="button"
                  onClick={() => slipInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--primary)]/40 bg-[var(--primary)]/5 px-4 py-8 text-center transition hover:border-[var(--primary)] hover:bg-[var(--primary)]/10"
                >
                  <span className="text-3xl">📎</span>
                  <span className="text-sm font-semibold text-[var(--primary)]">
                    แตะเพื่อแนบสลิป
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    JPG, PNG, WEBP ไม่เกิน 5 MB
                  </span>
                </button>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slipPreview}
                    alt="ตัวอย่างสลิปการโอน"
                    className="max-h-64 w-full object-contain bg-white"
                  />
                  <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] p-3">
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {slipFile?.name}
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => slipInputRef.current?.click()}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)]"
                      >
                        เปลี่ยน
                      </button>
                      <button
                        type="button"
                        onClick={removeSlip}
                        className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {slipError ? (
                <p className="mt-2 text-xs font-medium text-rose-600">
                  {slipError}
                </p>
              ) : null}

              {!slipFile ? (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  กรุณาแนบสลิปก่อนยืนยันคำสั่งซื้อ
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:col-span-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">ยอดอาหาร</span>
            <span className="text-[var(--text)]">{formatPrice(total)}</span>
          </div>
          {deliveryFee !== null ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">ค่าจัดส่ง</span>
              <span className="text-[var(--text)]">
                {discounts.deliveryDiscount > 0 ? (
                  <>
                    <span className="mr-2 text-[var(--text-muted)] line-through">
                      {formatPrice(deliveryFee)}
                    </span>
                    {formatPrice(Math.max(0, deliveryFee - discounts.deliveryDiscount))}
                  </>
                ) : (
                  formatPrice(deliveryFee)
                )}
              </span>
            </div>
          ) : null}
          {discounts.totalDiscount > 0 ? (
            <div className="flex items-center justify-between text-sm text-emerald-700">
              <span>ส่วนลด{discounts.label ? ` (${discounts.label})` : ""}</span>
              <span>-{formatPrice(discounts.totalDiscount)}</span>
            </div>
          ) : null}
          {appliedReferrer ? (
            <div className="flex items-center justify-between text-xs text-sky-700">
              <span>ส่วนลดให้คุณ{appliedReferrer.name} (รอบหน้า)</span>
              <span>{formatPrice(appliedReferrer.rewardAmount)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
            <span className="text-sm text-[var(--text-muted)]">ยอดชำระ</span>
            <span className="font-display text-2xl font-bold text-[var(--text)]">
              {formatPrice(payableTotal)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[var(--primary)] px-4 py-4 text-base font-bold text-white shadow-lg shadow-[var(--primary)]/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ยืนยันคำสั่งซื้อ
        </button>
      </section>
    </div>
  );
}

function CodeField({
  label,
  value,
  onChange,
  placeholder,
  onApply,
  onClear,
  applyLabel,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onApply: () => void;
  onClear?: () => void;
  applyLabel: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text)] outline-none ring-[var(--primary)] focus:ring-2 disabled:opacity-60"
        />
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold text-[var(--text-muted)]"
          >
            ลบ
          </button>
        ) : (
          <button
            type="button"
            onClick={onApply}
            disabled={!value.trim()}
            className="shrink-0 rounded-xl bg-[var(--secondary)] px-3 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applyLabel}
          </button>
        )}
      </div>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text)] outline-none ring-[var(--primary)] focus:ring-2"
      />
    </label>
  );
}

function PaymentChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
        active
          ? "bg-[var(--secondary)] text-white"
          : "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]"
      }`}
    >
      {label}
    </button>
  );
}
