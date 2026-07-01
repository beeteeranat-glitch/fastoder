import type { DbOrderStatus, DbOrderType } from "@/types/database";

export const ORDER_STATUS_LABELS: Record<DbOrderStatus, string> = {
  PENDING: "รอร้านยืนยัน",
  CONFIRMED: "รับออเดอร์แล้ว",
  PREPARING: "กำลังเตรียมสินค้า",
  READY_FOR_DELIVERY: "พร้อมจัดส่ง",
  DELIVERING: "กำลังจัดส่ง",
  COMPLETED: "จัดส่งสำเร็จ",
  CANCELLED: "ยกเลิกแล้ว",
};

export const CUSTOMER_TRACKING_STEPS: {
  status: DbOrderStatus;
  label: string;
}[] = [
  { status: "PENDING", label: "รอร้านยืนยัน" },
  { status: "CONFIRMED", label: "รับออเดอร์แล้ว" },
  { status: "PREPARING", label: "กำลังเตรียมสินค้า" },
  { status: "DELIVERING", label: "กำลังจัดส่ง" },
  { status: "COMPLETED", label: "จัดส่งสำเร็จ" },
];

export function customerTrackingStepIndex(status: DbOrderStatus) {
  if (status === "CANCELLED") return -1;
  if (status === "READY_FOR_DELIVERY") {
    return CUSTOMER_TRACKING_STEPS.findIndex((step) => step.status === "DELIVERING");
  }
  const index = CUSTOMER_TRACKING_STEPS.findIndex(
    (step) => step.status === status,
  );
  return index >= 0 ? index : 0;
}

const ACTIVE_STATUSES: DbOrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_DELIVERY",
  "DELIVERING",
];

export const STATUS_TRANSITIONS: Record<DbOrderStatus, DbOrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING"],
  PREPARING: ["DELIVERING"],
  READY_FOR_DELIVERY: ["DELIVERING"],
  DELIVERING: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const STATUS_ACTION_LABELS: Partial<Record<DbOrderStatus, string>> = {
  CONFIRMED: "รับออเดอร์แล้ว",
  PREPARING: "กำลังเตรียมสินค้า",
  READY_FOR_DELIVERY: "พร้อมจัดส่ง",
  DELIVERING: "กำลังจัดส่ง",
  COMPLETED: "จัดส่งสำเร็จ",
  CANCELLED: "ยกเลิกออเดอร์",
};

export function orderTypeLabel(orderType: DbOrderType | null | undefined) {
  if (orderType === "pickup") return "มารับหน้าร้าน";
  return "จัดส่ง";
}

export function orderStatusLabelForType(
  status: DbOrderStatus,
  orderType: DbOrderType | null | undefined,
) {
  if (orderType !== "pickup") return ORDER_STATUS_LABELS[status];

  const pickupLabels: Partial<Record<DbOrderStatus, string>> = {
    READY_FOR_DELIVERY: "พร้อมให้รับ",
    DELIVERING: "รอลูกค้ามารับ",
    COMPLETED: "รับสินค้าแล้ว",
  };

  return pickupLabels[status] ?? ORDER_STATUS_LABELS[status];
}

export function statusActionLabelForType(
  status: DbOrderStatus,
  orderType: DbOrderType | null | undefined,
) {
  if (orderType !== "pickup") {
    return STATUS_ACTION_LABELS[status] ?? "อัปเดตสถานะ";
  }

  const pickupLabels: Partial<Record<DbOrderStatus, string>> = {
    DELIVERING: "พร้อมให้รับ",
    COMPLETED: "ลูกค้ารับแล้ว",
  };

  return pickupLabels[status] ?? STATUS_ACTION_LABELS[status] ?? "อัปเดตสถานะ";
}

export function getNextAdminStatus(
  current: DbOrderStatus,
): DbOrderStatus | null {
  const nextMap: Partial<Record<DbOrderStatus, DbOrderStatus>> = {
    PENDING: "CONFIRMED",
    CONFIRMED: "PREPARING",
    PREPARING: "DELIVERING",
    READY_FOR_DELIVERY: "DELIVERING",
    DELIVERING: "COMPLETED",
  };

  return nextMap[current] ?? null;
}

export function isActiveOrderStatus(status: DbOrderStatus) {
  return ACTIVE_STATUSES.includes(status);
}

export function canAdminActOnOrder(status: DbOrderStatus) {
  return STATUS_TRANSITIONS[status].length > 0;
}

function randomLetters(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function generateOrderNumber() {
  const letters = randomLetters(2);
  const digits = String(Math.floor(Math.random() * 10_000)).padStart(4, "0");
  return `${letters}-${digits}`;
}

export function canTransitionStatus(
  current: DbOrderStatus,
  next: DbOrderStatus,
) {
  return STATUS_TRANSITIONS[current].includes(next);
}

export function formatOrderDate(iso: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function paymentMethodLabel(method: "cash" | "transfer") {
  if (method === "cash") return "เงินสด";
  return "โอนเงิน";
}
