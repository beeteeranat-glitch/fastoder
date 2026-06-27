export type DeliverySettings = {
  minMeters: number;
  maxMeters: number;
  blockMeters: number;
  tiers: { distanceMeters: number; feeBaht: number }[];
};

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  minMeters: 500,
  maxMeters: 2000,
  blockMeters: 500,
  tiers: [
    { distanceMeters: 500, feeBaht: 5 },
    { distanceMeters: 1000, feeBaht: 8 },
    { distanceMeters: 1500, feeBaht: 10 },
    { distanceMeters: 2000, feeBaht: 12 },
  ],
};

/** @deprecated ใช้ DeliverySettings แทน */
export const DELIVERY_MIN_METERS = DEFAULT_DELIVERY_SETTINGS.minMeters;
/** @deprecated ใช้ DeliverySettings แทน */
export const DELIVERY_MAX_METERS = DEFAULT_DELIVERY_SETTINGS.maxMeters;

function getFeeMap(settings: DeliverySettings) {
  const map: Record<number, number> = {};
  for (const tier of settings.tiers) {
    map[tier.distanceMeters] = tier.feeBaht;
  }
  return map;
}

function getBilledMeters(distanceMeters: number, settings: DeliverySettings) {
  if (distanceMeters > settings.maxMeters) return null;
  const block =
    Math.ceil(distanceMeters / settings.blockMeters) * settings.blockMeters;
  const billed = Math.max(settings.minMeters, block);
  if (billed > settings.maxMeters) return null;
  return billed;
}

export function formatDeliveryRangeFromSettings(settings: DeliverySettings) {
  const min = formatDistance(settings.minMeters);
  const max = formatDistance(settings.maxMeters);
  return `${min} – ${max}`;
}

export function formatDeliveryRange(settings = DEFAULT_DELIVERY_SETTINGS) {
  return formatDeliveryRangeFromSettings(settings);
}

export function calcDeliveryFeeFromSettings(
  distanceMeters: number,
  settings: DeliverySettings,
): number | null {
  const billed = getBilledMeters(distanceMeters, settings);
  if (billed === null) return null;
  const feeMap = getFeeMap(settings);
  return feeMap[billed] ?? null;
}

export function isDeliverableFromSettings(
  distanceMeters: number,
  settings: DeliverySettings,
) {
  return distanceMeters <= settings.maxMeters;
}

export function getDeliveryFeeLabelFromSettings(
  distanceMeters: number,
  settings: DeliverySettings,
) {
  const billed = getBilledMeters(distanceMeters, settings);
  if (billed === null) return null;
  return `ระยะ ${formatDistance(billed)}`;
}

export function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${distanceMeters} ม.`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} กม.`;
}

export function calcDeliveryFee(distanceMeters: number) {
  return calcDeliveryFeeFromSettings(distanceMeters, DEFAULT_DELIVERY_SETTINGS);
}

export function isDeliverable(distanceMeters: number) {
  return isDeliverableFromSettings(distanceMeters, DEFAULT_DELIVERY_SETTINGS);
}

export function getDeliveryFeeLabel(distanceMeters: number) {
  return getDeliveryFeeLabelFromSettings(
    distanceMeters,
    DEFAULT_DELIVERY_SETTINGS,
  );
}
