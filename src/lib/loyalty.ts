export type LoyaltySettings = {
  earnSpendAmount: number;
  earnPoints: number;
  redemptionPoints: number;
};

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  earnSpendAmount: 100,
  earnPoints: 10,
  redemptionPoints: 100,
};

export function calcEarnedPoints(
  payableTotal: number,
  settings: LoyaltySettings = DEFAULT_LOYALTY_SETTINGS,
) {
  return Math.max(0, Math.floor(payableTotal / settings.earnSpendAmount) * settings.earnPoints);
}
