"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/cart-context";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useShop } from "@/context/shop-context";
import {
  calcCartTotal,
  calcDistanceMeters,
  calcItemUnitPrice,
  formatPrice,
} from "@/lib/format";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { formatDeliveryAddress } from "@/lib/format-address";
import {
  calcDeliveryFeeFromSettings,
  DEFAULT_DELIVERY_SETTINGS,
  formatDeliveryRangeFromSettings,
  formatDistance,
  getDeliveryFeeLabelFromSettings,
  isDeliverableFromSettings,
  type DeliverySettings,
} from "@/lib/delivery-fee";
import {
  calcOrderDiscounts,
  isValidReferrerPhone,
  normalizeReferrerPhone,
  sanitizeReferrerPhoneInput,
  type PromoDefinition,
} from "@/lib/promotions";
import type { ReferrerDefinition } from "@/lib/referrer-lookup";
import {
  calcFreeDrinkDiscount,
  FREE_DRINK_POINTS,
} from "@/lib/points-data";
import {
  formatPhoneInput,
  isValidPhone,
  normalizePhone,
  PHONE_INPUT_MAX_LENGTH,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";

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

const ACCEPTED_SLIP_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function CheckoutFlow() {
  const router = useRouter();
  const { shop } = useShop();
  const { customer, refresh: refreshCustomer } = useCustomerAuth();
  const { items, clearCart } = useCart();
  const total = calcCartTotal(items);

  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
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
  const [referrerLoading, setReferrerLoading] = useState(false);
  const [useFreeDrinkReward, setUseFreeDrinkReward] = useState(false);
  const [freeDrinkCartItemId, setFreeDrinkCartItemId] = useState<string | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phoneCustomer, setPhoneCustomer] = useState<{ points: number } | null>(
    null,
  );
  const [phoneCustomerLoading, setPhoneCustomerLoading] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(
    DEFAULT_DELIVERY_SETTINGS,
  );
  const slipInputRef = useRef<HTMLInputElement>(null);
  const profilePrefilledRef = useRef(false);

  useEffect(() => {
    if (!customer || profilePrefilledRef.current) return;
    profilePrefilledRef.current = true;

    setCustomerName((prev) => prev.trim() || customer.name);
    setCustomerPhone(
      (prev) => prev.trim() || formatPhoneInput(customer.phone),
    );
    if (customer.defaultAddress?.trim()) {
      setStreetDetail(
        (prev) => prev.trim() || customer.defaultAddress!.trim(),
      );
    }
  }, [customer]);

  useEffect(() => {
    if (!isValidPhone(customerPhone)) {
      setPhoneCustomer(null);
      return;
    }

    const phone = normalizePhone(customerPhone);
    setPhoneCustomerLoading(true);
    const timer = window.setTimeout(() => {
      void fetch(`/api/customer/lookup?phone=${encodeURIComponent(phone)}`, {
        cache: "no-store",
      })
        .then((res) => res.json())
        .then((data: { customer?: { points?: number } | null }) => {
          setPhoneCustomer(
            data.customer ? { points: data.customer.points ?? 0 } : null,
          );
        })
        .catch(() => setPhoneCustomer(null))
        .finally(() => setPhoneCustomerLoading(false));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [customerPhone]);

  useEffect(() => {
    void fetch("/api/delivery-settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: DeliverySettings) => {
        if (data?.maxMeters && data?.tiers?.length) {
          setDeliverySettings(data);
        }
      })
      .catch(() => {});
  }, []);

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
      shop.latitude,
      shop.longitude,
      customerLocation.latitude,
      customerLocation.longitude,
    );
  }, [customerLocation, shop.latitude, shop.longitude]);

  const inRange =
    distance !== null && isDeliverableFromSettings(distance, deliverySettings);

  const deliveryFee =
    distance !== null
      ? calcDeliveryFeeFromSettings(distance, deliverySettings)
      : null;

  const deliveryRangeLabel = formatDeliveryRangeFromSettings(deliverySettings);

  const discounts = useMemo(
    () =>
      calcOrderDiscounts({
        foodTotal: total,
        deliveryFee,
        promo: appliedPromo,
      }),
    [total, deliveryFee, appliedPromo],
  );

  const availablePoints = phoneCustomer?.points ?? 0;

  const canRedeemFreeDrink =
    phoneCustomer !== null && availablePoints >= FREE_DRINK_POINTS;

  const defaultFreeDrinkItem = useMemo(() => {
    if (items.length === 0) return null;
    return items.reduce((best, item) =>
      item.basePrice * item.quantity > best.basePrice * best.quantity
        ? item
        : best,
    );
  }, [items]);

  const selectedFreeDrinkItem = useMemo(() => {
    if (!freeDrinkCartItemId) return defaultFreeDrinkItem;
    return items.find((item) => item.id === freeDrinkCartItemId) ?? defaultFreeDrinkItem;
  }, [freeDrinkCartItemId, items, defaultFreeDrinkItem]);

  useEffect(() => {
    if (!defaultFreeDrinkItem) {
      setFreeDrinkCartItemId(null);
      setUseFreeDrinkReward(false);
      return;
    }
    setFreeDrinkCartItemId((current) => {
      if (current && items.some((item) => item.id === current)) return current;
      return defaultFreeDrinkItem.id;
    });
  }, [defaultFreeDrinkItem, items]);

  useEffect(() => {
    if (!canRedeemFreeDrink) setUseFreeDrinkReward(false);
  }, [canRedeemFreeDrink]);

  const rewardDiscount = useMemo(() => {
    if (!useFreeDrinkReward || !selectedFreeDrinkItem) return 0;
    return calcFreeDrinkDiscount(
      selectedFreeDrinkItem.basePrice,
      selectedFreeDrinkItem.quantity,
    );
  }, [useFreeDrinkReward, selectedFreeDrinkItem]);

  const subtotal =
    deliveryFee !== null ? total + deliveryFee : total;

  const payableTotal = Math.max(
    0,
    subtotal - discounts.totalDiscount - rewardDiscount,
  );

  const deliveryAddress = useMemo(() => {
    if (!customerLocation) return null;

    const area = customerLocation.areaAddress?.trim() ?? "";
    const street = streetDetail.trim();
    const house = addressDetail.trim();
    const geocodedHouse = customerLocation.houseNumber?.trim() ?? "";

    if (!area && !street && !house && !geocodedHouse) return null;

    return formatDeliveryAddress({
      houseDetail: addressDetail,
      streetLine: streetDetail,
      areaAddress: area,
      geocodedHouseNumber: customerLocation.houseNumber,
    });
  }, [addressDetail, streetDetail, customerLocation]);

  const submitBlockers = useMemo(() => {
    const blockers: string[] = [];

    if (!customerName.trim()) blockers.push("กรอกชื่อ");
    if (!isValidPhone(customerPhone)) {
      blockers.push("กรอกเบอร์โทรให้ถูกต้อง (10 หลัก)");
    }
    if (!customerLocation) {
      blockers.push("เลือกตำแหน่งจัดส่ง (GPS หรือแผนที่)");
    } else {
      if (!inRange) blockers.push("ตำแหน่งอยู่นอกพื้นที่จัดส่ง");
      if (addressLoading) blockers.push("รอระบบค้นหาที่อยู่");
      if (
        !addressDetail.trim() &&
        !streetDetail.trim() &&
        !customerLocation.areaAddress?.trim() &&
        !customerLocation.houseNumber?.trim()
      ) {
        blockers.push("กรอกบ้านเลขที่หรือรายละเอียดที่อยู่");
      } else if (!deliveryAddress?.trim()) {
        blockers.push("กรอกรายละเอียดที่อยู่ให้ครบ");
      }
    }
    if (paymentMethod === "transfer" && !slipFile) {
      blockers.push("แนบสลิปโอนเงิน");
    }

    return blockers;
  }, [
    customerName,
    customerPhone,
    customerLocation,
    inRange,
    addressLoading,
    addressDetail,
    streetDetail,
    deliveryAddress,
    paymentMethod,
    slipFile,
  ]);

  const canSubmit = submitBlockers.length === 0;

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
    if (method !== "transfer") {
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

  const applyPromoCode = async () => {
    if (!promoInput.trim()) {
      setAppliedPromo(null);
      setPromoError("กรุณากรอกโค้ด");
      return;
    }

    try {
      const response = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput, foodTotal: total }),
      });
      const data = (await response.json()) as {
        promo?: PromoDefinition;
        error?: string;
      };

      if (!response.ok || !data.promo) {
        setAppliedPromo(null);
        setPromoError(data.error ?? "โค้ดโปรโมชั่นไม่ถูกต้อง");
        return;
      }

      setAppliedPromo(data.promo);
      setPromoError(null);
    } catch {
      setAppliedPromo(null);
      setPromoError("ตรวจสอบโค้ดไม่สำเร็จ");
    }
  };

  const clearPromoCode = () => {
    setPromoInput("");
    setAppliedPromo(null);
    setPromoError(null);
  };

  const applyReferrerCode = async () => {
    const phone = normalizeReferrerPhone(referrerInput);
    if (!isValidReferrerPhone(phone)) {
      setAppliedReferrer(null);
      setReferrerError("กรุณากรอกเบอร์โทรให้ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)");
      return;
    }

    setReferrerLoading(true);
    setReferrerError(null);

    try {
      const response = await fetch(
        `/api/referrers/lookup?phone=${encodeURIComponent(phone)}`,
      );
      const data = (await response.json()) as {
        referrer?: ReferrerDefinition;
        error?: string;
      };

      if (!response.ok || !data.referrer) {
        setAppliedReferrer(null);
        setReferrerError(data.error ?? "ไม่พบเบอร์ผู้แนะนำในระบบ");
        return;
      }

      setReferrerInput(formatPhoneInput(phone));
      setAppliedReferrer(data.referrer);
    } catch {
      setAppliedReferrer(null);
      setReferrerError("ตรวจสอบเบอร์ไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setReferrerLoading(false);
    }
  };

  const clearReferrerCode = () => {
    setReferrerInput("");
    setAppliedReferrer(null);
    setReferrerError(null);
  };

  const handleSubmit = async () => {
    if (
      !canSubmit ||
      submitting ||
      !customerLocation ||
      !deliveryAddress ||
      deliveryFee === null ||
      distance === null
    ) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      let paymentSlipUrl: string | null = null;

      if (paymentMethod === "transfer") {
        if (!slipFile) {
          throw new Error("กรุณาแนบสลิปโอนเงิน");
        }

        const slipForm = new FormData();
        slipForm.append("file", slipFile);
        const slipRes = await fetch("/api/payment-slips/upload", {
          method: "POST",
          body: slipForm,
        });
        const slipData = (await slipRes.json()) as {
          url?: string;
          error?: string;
        };
        if (!slipRes.ok || !slipData.url) {
          throw new Error(slipData.error ?? "อัปโหลดสลิปไม่สำเร็จ");
        }
        paymentSlipUrl = slipData.url;
      }

      const mappedItems = items.map((item) => {
            const unitPrice = calcItemUnitPrice(
              item.basePrice,
              item.options,
              item.toppings,
              item.addons,
            );
            return {
              cartItemId: item.id,
              productId: item.productId,
              productName: item.name,
              quantity: item.quantity,
              basePrice: item.basePrice,
              unitPrice,
              options: item.options,
              toppings: item.toppings,
              addons: item.addons,
              lineTotal: unitPrice * item.quantity,
            };
          });

      if (useFreeDrinkReward && selectedFreeDrinkItem) {
        const selectedIndex = mappedItems.findIndex(
          (item) => item.cartItemId === selectedFreeDrinkItem.id,
        );
        if (selectedIndex > 0) {
          const [selected] = mappedItems.splice(selectedIndex, 1);
          mappedItems.unshift(selected);
        }
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone: normalizePhone(customerPhone),
          customerNote: note.trim() || null,
          deliveryAddress,
          deliveryLatitude: customerLocation.latitude,
          deliveryLongitude: customerLocation.longitude,
          distanceMeters: distance,
          foodTotal: total,
          deliveryFee,
          discountTotal: discounts.totalDiscount,
          payableTotal,
          paymentMethod,
          paymentSlipUrl,
          promoCode: appliedPromo?.code ?? null,
          referrerCode: appliedReferrer?.code ?? null,
          useFreeDrinkReward,
          freeDrinkProductId: selectedFreeDrinkItem?.productId ?? null,
          items: mappedItems.map(({ cartItemId: _cartItemId, ...item }) => item),
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        orderNumber?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "สั่งซื้อไม่สำเร็จ");
      }

      if (!data.orderNumber) {
        throw new Error("สั่งซื้อไม่สำเร็จ");
      }

      clearCart();
      if (useFreeDrinkReward) void refreshCustomer();

      router.replace(
        `/order-success?orderNumber=${encodeURIComponent(data.orderNumber)}&total=${payableTotal}`,
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "สั่งซื้อไม่สำเร็จ",
      );
    } finally {
      setSubmitting(false);
    }
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
          <PhoneField
            label="เบอร์โทร"
            value={customerPhone}
            onChange={setCustomerPhone}
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
          จัดส่งได้ในระยะ {deliveryRangeLabel} ค่าส่งคิดตามระยะทาง
        </p>

        <div className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            ร้าน
          </p>
          <p className="mt-1 font-semibold text-[var(--text)]">
            {shop.name}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {shop.address}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
              ที่อยู่จัดส่ง
            </span>
            {customer?.defaultAddress ? (
              <span className="mb-2 block text-xs font-medium text-[var(--primary)]">
                ดึงจากบัญชีของคุณ — แก้ไขได้
              </span>
            ) : null}
            <textarea
              value={streetDetail}
              onChange={(e) => setStreetDetail(e.target.value)}
              rows={3}
              placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล"
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text)] outline-none ring-[var(--primary)] focus:ring-2"
            />
          </label>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            เลือก GPS หรือแผนที่ด้านล่างเพื่อคำนวณระยะทางและค่าส่ง
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
          maxMeters={deliverySettings.maxMeters}
          deliveryRangeLabel={deliveryRangeLabel}
          onConfirm={(latitude, longitude) =>
            applyLocation(latitude, longitude, "map", 0, true)
          }
          restaurant={{
            name: shop.name,
            latitude: shop.latitude,
            longitude: shop.longitude,
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
              label="บ้านเลขที่ / อาคาร / ชั้น (ถ้ามีเพิ่ม)"
              value={addressDetail}
              onChange={setAddressDetail}
              placeholder="เช่น 88/12 ชั้น 3"
            />

            {deliveryAddress ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
                <p className="text-xs font-semibold text-[var(--text-muted)]">
                  ที่อยู่จัดส่ง
                </p>
                <p className="mt-1 font-medium text-[var(--text)]">
                  {deliveryAddress}
                </p>
              </div>
            ) : (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                กรอกบ้านเลขที่หรือรายละเอียดที่อยู่เพื่อยืนยันคำสั่งซื้อ
              </p>
            )}
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
                {getDeliveryFeeLabelFromSettings(distance, deliverySettings)
                  ? ` (${getDeliveryFeeLabelFromSettings(distance, deliverySettings)})`
                  : ""}{" "}
                — ค่าส่ง {formatPrice(deliveryFee)}
              </>
            ) : (
              `✕ ระยะทาง ${formatDistance(distance)} — จัดส่งได้ในระยะ ${deliveryRangeLabel}`
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:col-span-2">
        <h2 className="font-display text-lg font-bold text-[var(--text)]">
          โปรโมชั่น & คนแนะนำ
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          ใส่โค้ดส่วนลดได้ทันที — ผู้แนะนำจะได้รับคะแนน
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
              onApply={() => void applyPromoCode()}
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
              label="เบอร์โทรคนแนะนำ (ไม่บังคับ)"
              value={referrerInput}
              onChange={(value) => {
                setReferrerInput(sanitizeReferrerPhoneInput(value));
                setReferrerError(null);
              }}
              placeholder={PHONE_PLACEHOLDER}
              onApply={() => void applyReferrerCode()}
              onClear={appliedReferrer ? clearReferrerCode : undefined}
              applyLabel={
                referrerLoading
                  ? "กำลังตรวจ..."
                  : appliedReferrer
                    ? "เปลี่ยน"
                    : "ยืนยัน"
              }
              disabled={Boolean(appliedReferrer) || referrerLoading}
              inputMode="numeric"
              maxLength={PHONE_INPUT_MAX_LENGTH}
            />
            {referrerError ? (
              <p className="text-xs font-medium text-rose-600">{referrerError}</p>
            ) : null}
            {appliedReferrer ? (
              <p className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                ✓ คุณ{appliedReferrer.name} ได้รับคะแนน
              </p>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                ใช้เบอร์ที่เคยสั่งในระบบ หรือเคยเป็นผู้แนะนำมาก่อน
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:col-span-2">
        <h2 className="font-display text-lg font-bold text-[var(--text)]">
          แลกคะแนน
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          ใช้ {FREE_DRINK_POINTS} คะแนน แลกฟรีราคาเครื่องดื่มหลัก 1 รายการ
          (Topping / Add-on คิดเงินตามปกติ)
        </p>

        {!isValidPhone(customerPhone) ? (
          <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-muted)]">
            กรอกเบอร์โทรที่เคยสั่งในระบบเพื่อใช้คะแนนสะสม
          </p>
        ) : phoneCustomerLoading ? (
          <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-muted)]">
            กำลังตรวจสอบคะแนน...
          </p>
        ) : !phoneCustomer ? (
          <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-muted)]">
            ยังไม่มีคะแนนสำหรับเบอร์นี้ — สั่งซื้อและรอออเดอร์ COMPLETED เพื่อสะสมคะแนน
          </p>
        ) : availablePoints < FREE_DRINK_POINTS ? (
          <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-muted)]">
            คะแนนคงเหลือ {availablePoints} — ต้องมีอย่างน้อย{" "}
            {FREE_DRINK_POINTS} คะแนน
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-amber-700">
              คะแนนคงเหลือ {availablePoints} คะแนน
            </p>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
              <input
                type="checkbox"
                checked={useFreeDrinkReward}
                onChange={(event) =>
                  setUseFreeDrinkReward(event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-[var(--border)] text-[var(--primary)]"
              />
              <span>
                <span className="block text-sm font-bold text-[var(--text)]">
                  ใช้สิทธิ์แลกเครื่องดื่มฟรี (-{FREE_DRINK_POINTS} คะแนน)
                </span>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">
                  หักจากราคาเครื่องดื่มหลักของรายการที่เลือก
                </span>
              </span>
            </label>

            {useFreeDrinkReward && items.length > 1 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--text-muted)]">
                  เลือกรายการที่ใช้สิทธิ์
                </p>
                {items.map((item) => (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                      freeDrinkCartItemId === item.id
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="free-drink-item"
                      checked={freeDrinkCartItemId === item.id}
                      onChange={() => setFreeDrinkCartItemId(item.id)}
                      className="h-4 w-4 text-[var(--primary)]"
                    />
                    <span className="min-w-0 flex-1 font-medium">{item.name}</span>
                    <span className="shrink-0 text-[var(--text-muted)]">
                      ฟรี {formatPrice(item.basePrice * item.quantity)}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}

            {useFreeDrinkReward && selectedFreeDrinkItem ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                ✓ ลด {formatPrice(rewardDiscount)} จาก {selectedFreeDrinkItem.name}
              </p>
            ) : null}
          </div>
        )}
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
            {shop.paymentQrUrl ? (
              <div className="flex flex-col items-center rounded-2xl bg-[var(--surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  สแกน QR เพื่อโอนเงิน
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shop.paymentQrUrl}
                  alt="QR Code รับเงิน"
                  className="mt-3 max-h-56 w-full max-w-56 rounded-xl bg-white object-contain"
                />
                <p className="mt-3 text-sm font-semibold text-[var(--text)]">
                  ยอดโอน: {formatPrice(payableTotal)}
                </p>
              </div>
            ) : null}

            {(shop.bankName || shop.bankAccountNumber || shop.bankAccountName) ? (
              <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  บัญชีรับโอน
                </p>
                {shop.bankName ? (
                  <p className="mt-2 font-semibold text-[var(--text)]">
                    {shop.bankName}
                  </p>
                ) : null}
                {shop.bankAccountNumber ? (
                  <p className="mt-1 font-display text-xl font-bold tracking-wide text-[var(--primary)]">
                    {shop.bankAccountNumber}
                  </p>
                ) : null}
                {shop.bankAccountName ? (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {shop.bankAccountName}
                  </p>
                ) : null}
                {!shop.paymentQrUrl ? (
                  <p className="mt-3 text-sm font-semibold text-[var(--text)]">
                    ยอดโอน: {formatPrice(payableTotal)}
                  </p>
                ) : null}
              </div>
            ) : null}

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
          {rewardDiscount > 0 ? (
            <div className="flex items-center justify-between text-sm text-emerald-700">
              <span>แลกเครื่องดื่มฟรี ({FREE_DRINK_POINTS} คะแนน)</span>
              <span>-{formatPrice(rewardDiscount)}</span>
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
          onClick={() => void handleSubmit()}
          disabled={!canSubmit || submitting}
          className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[var(--primary)] px-4 py-4 text-base font-bold text-white shadow-lg shadow-[var(--primary)]/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "กำลังส่งออเดอร์..." : "ยืนยันคำสั่งซื้อ"}
        </button>
        {!canSubmit && !submitting && submitBlockers.length > 0 ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            กรุณา{submitBlockers.join(" · ")} ก่อนยืนยัน
          </p>
        ) : null}
        {submitError ? (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {submitError}
          </p>
        ) : null}
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
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onApply: () => void;
  onClear?: () => void;
  applyLabel: string;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      <div className="flex gap-2">
        <input
          type="tel"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={inputMode}
          maxLength={maxLength}
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

function PhoneField({
  label,
  value,
  onChange,
  placeholder = PHONE_PLACEHOLDER,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      <input
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(formatPhoneInput(event.target.value))}
        placeholder={placeholder}
        maxLength={PHONE_INPUT_MAX_LENGTH}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm tabular-nums text-[var(--text)] outline-none ring-[var(--primary)] focus:ring-2"
      />
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
