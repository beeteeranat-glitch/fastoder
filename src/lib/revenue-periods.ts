const BANGKOK_TZ = "Asia/Bangkok";

export function getBangkokDateString(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: BANGKOK_TZ });
}

export function bangkokStartIso(dateString: string) {
  return new Date(`${dateString}T00:00:00+07:00`).toISOString();
}

function shiftBangkokDate(dateString: string, days: number) {
  const anchor = new Date(`${dateString}T12:00:00+07:00`);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return getBangkokDateString(anchor);
}

function bangkokWeekdayIndex(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: BANGKOK_TZ,
    weekday: "short",
  }).format(date);

  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  return map[weekday] ?? 0;
}

export function bangkokEndExclusiveIso(dateString: string) {
  return bangkokStartIso(shiftBangkokDate(dateString, 1));
}

export function isValidBangkokDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function formatBangkokDateLabel(dateString: string) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: BANGKOK_TZ,
    dateStyle: "medium",
  }).format(new Date(bangkokStartIso(dateString)));
}

export function formatRevenueRangeLabel(from: string, to: string) {
  if (from === to) return formatBangkokDateLabel(from);
  return `${formatBangkokDateLabel(from)} – ${formatBangkokDateLabel(to)}`;
}

export function countDaysInclusive(from: string, to: string) {
  const start = new Date(bangkokStartIso(from)).getTime();
  const end = new Date(bangkokStartIso(to)).getTime();
  if (end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function getRevenuePeriodStarts(anchorDateString = getBangkokDateString()) {
  const today = anchorDateString;
  const anchorDate = new Date(bangkokStartIso(anchorDateString));
  const weekStart = shiftBangkokDate(today, -bangkokWeekdayIndex(anchorDate));
  const [year, month] = today.split("-");
  const monthStart = `${year}-${month}-01`;

  return {
    daily: { from: today, to: today, startIso: bangkokStartIso(today) },
    weekly: {
      from: weekStart,
      to: today,
      startIso: bangkokStartIso(weekStart),
    },
    monthly: {
      from: monthStart,
      to: today,
      startIso: bangkokStartIso(monthStart),
    },
  };
}

export type RevenueSummary = {
  total: number;
  orderCount: number;
  from: string;
  to: string;
  label: string;
};

export function summarizeRevenue(
  orders: { payable_total: number; created_at: string }[],
  periodStartIso: string,
  from: string,
  to: string,
) {
  const startMs = new Date(periodStartIso).getTime();
  const endMs = new Date(bangkokEndExclusiveIso(to)).getTime();

  const summary = orders.reduce(
    (acc, order) => {
      const createdMs = new Date(order.created_at).getTime();
      if (createdMs < startMs || createdMs >= endMs) return acc;
      acc.total += order.payable_total;
      acc.orderCount += 1;
      return acc;
    },
    { total: 0, orderCount: 0 },
  );

  return {
    ...summary,
    from,
    to,
    label: formatRevenueRangeLabel(from, to),
  };
}

export function summarizeRevenueRange(
  orders: { payable_total: number; created_at: string }[],
  from: string,
  to: string,
) {
  return summarizeRevenue(orders, bangkokStartIso(from), from, to);
}
