import type { DbOrderStatus } from "@/types/database";

const BASE_PREP_MINUTES = 12;
const MINUTES_PER_KM = 4;

export function estimateDeliveryEtaMinutes(
  distanceMeters: number | null,
  status: DbOrderStatus,
) {
  const distanceKm = (distanceMeters ?? 800) / 1000;
  const travelMinutes = Math.max(5, Math.round(distanceKm * MINUTES_PER_KM));

  const statusRemaining: Record<DbOrderStatus, number> = {
    PENDING: BASE_PREP_MINUTES + travelMinutes,
    CONFIRMED: BASE_PREP_MINUTES - 2 + travelMinutes,
    PREPARING: Math.max(8, BASE_PREP_MINUTES - 5) + travelMinutes,
    READY_FOR_DELIVERY: travelMinutes + 5,
    DELIVERING: Math.max(5, travelMinutes - 2),
    COMPLETED: 0,
    CANCELLED: 0,
  };

  return statusRemaining[status] ?? BASE_PREP_MINUTES + travelMinutes;
}

export function formatEtaLabel(minutes: number) {
  if (minutes <= 0) return "ถึงแล้ว";
  if (minutes < 60) return `ประมาณ ${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0
    ? `ประมาณ ${hours} ชม. ${mins} นาที`
    : `ประมาณ ${hours} ชม.`;
}
