"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import {
  countDaysInclusive,
  getBangkokDateString,
  getRevenuePeriodStarts,
} from "@/lib/revenue-periods";

type RevenueStats = {
  total: number;
  orderCount: number;
  from: string;
  to: string;
  label: string;
};

type CustomRevenueResponse = {
  custom?: RevenueStats;
  error?: string;
};

type PresetKey = "daily" | "weekly" | "monthly";

function detectPreset(
  from: string,
  to: string,
  anchor: string,
): PresetKey | "custom" {
  const periods = getRevenuePeriodStarts(anchor);
  if (from === periods.daily.from && to === periods.daily.to) return "daily";
  if (from === periods.weekly.from && to === periods.weekly.to) return "weekly";
  if (from === periods.monthly.from && to === periods.monthly.to) return "monthly";
  return "custom";
}

export function AdminRevenuePanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const today = getBangkokDateString();
  const [rangeFrom, setRangeFrom] = useState(today);
  const [rangeTo, setRangeTo] = useState(today);
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activePreset = useMemo(
    () => detectPreset(rangeFrom, rangeTo, today),
    [rangeFrom, rangeTo, today],
  );

  const loadRange = useCallback(async (from: string, to: string) => {
    if (!from || !to || from > to) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/revenue?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as CustomRevenueResponse;
      if (!res.ok || !data.custom) {
        throw new Error(data.error ?? "โหลดยอดรายได้ไม่สำเร็จ");
      }
      setStats(data.custom);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดยอดรายได้ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRange(rangeFrom, rangeTo);
  }, [loadRange, rangeFrom, rangeTo, refreshKey]);

  const selectPreset = (preset: PresetKey) => {
    const period = getRevenuePeriodStarts(today)[preset];
    setRangeFrom(period.from);
    setRangeTo(period.to);
  };

  const days = stats ? countDaysInclusive(stats.from, stats.to) : 0;
  const averagePerDay =
    stats && days > 0 ? Math.round(stats.total / days) : 0;

  const presetButtons: { key: PresetKey; label: string }[] = [
    { key: "daily", label: "วันนี้" },
    { key: "weekly", label: "สัปดาห์นี้" },
    { key: "monthly", label: "เดือนนี้" },
  ];

  const kpiCards = [
    {
      title: "ยอดรายได้",
      value: loading ? "…" : formatPrice(stats?.total ?? 0),
      hint: stats?.label ?? "-",
      tone: "text-emerald-700",
    },
    {
      title: "จำนวนออเดอร์",
      value: loading ? "…" : String(stats?.orderCount ?? 0),
      hint: "ออเดอร์ที่รับแล้ว",
      tone: "text-sky-700",
    },
    {
      title: "เฉลี่ยต่อวัน",
      value: loading ? "…" : formatPrice(averagePerDay),
      hint: days > 0 ? `${days} วันในช่วงที่เลือก` : "-",
      tone: "text-indigo-700",
    },
  ];

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-[var(--text)]">
            ยอดรายได้
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            นับจากออเดอร์ที่รับแล้ว · เวลาไทย
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {presetButtons.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => selectPreset(preset.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  activePreset === preset.key
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--surface-muted)] text-[var(--text-muted)] ring-1 ring-[var(--border)] hover:text-[var(--text)]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:items-end lg:w-[22rem]">
          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-[11px] font-semibold text-[var(--text-muted)]">
              ตั้งแต่
            </span>
            <input
              type="date"
              value={rangeFrom}
              max={rangeTo || today}
              onChange={(event) => setRangeFrom(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-[11px] font-semibold text-[var(--text-muted)]">
              ถึง
            </span>
            <input
              type="date"
              value={rangeTo}
              min={rangeFrom}
              max={today}
              onChange={(event) => setRangeTo(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {kpiCards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl bg-[var(--surface-muted)] p-4"
          >
            <p className="text-sm font-semibold text-[var(--text)]">
              {card.title}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              {loading ? "…" : card.hint}
            </p>
            <p className={`font-display mt-2 text-2xl font-bold ${card.tone}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
