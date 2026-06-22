export const DELIVERY_MIN_KM = 1;
export const DELIVERY_MAX_KM = 10;

/** อัตราค่าส่งตามกม. (5–20 บาท) */
const FEE_BY_KM: Record<number, number> = {
  1: 5,
  2: 6,
  3: 8,
  4: 10,
  5: 12,
  6: 14,
  7: 16,
  8: 17,
  9: 19,
  10: 20,
};

export function calcDeliveryFee(distanceMeters: number): number | null {
  const km = Math.ceil(distanceMeters / 1000);
  const billedKm = Math.max(DELIVERY_MIN_KM, km);

  if (billedKm > DELIVERY_MAX_KM) return null;
  return FEE_BY_KM[billedKm];
}

export function isDeliverable(distanceMeters: number) {
  return calcDeliveryFee(distanceMeters) !== null;
}

export function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${distanceMeters} ม.`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} กม.`;
}

export function getDeliveryFeeLabel(distanceMeters: number) {
  const km = Math.ceil(distanceMeters / 1000);
  const billedKm = Math.max(DELIVERY_MIN_KM, km);
  if (billedKm > DELIVERY_MAX_KM) return null;
  return `ระยะ ${billedKm} กม.`;
}
