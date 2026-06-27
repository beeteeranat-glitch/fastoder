export const REFERRAL_POINTS_PER_CUSTOMER = 10;

export function calcReferrerPoints(referralCount: number) {
  return referralCount * REFERRAL_POINTS_PER_CUSTOMER;
}

export type ReferrerStat = {
  code: string;
  name: string;
  referralCount: number;
  points: number;
  recentReferrals: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    createdAt: string;
    status: string;
  }[];
};
