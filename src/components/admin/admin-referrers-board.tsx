"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPhoneForDisplay } from "@/lib/phone";
import {
  REFERRAL_POINTS_PER_CUSTOMER,
  type ReferrerStat,
} from "@/lib/referrers";

export function AdminReferrersBoard() {
  const [referrers, setReferrers] = useState<ReferrerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/referrers");

      const data = (await res.json()) as {
        referrers?: ReferrerStat[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "โหลดไม่สำเร็จ");
      }

      setReferrers(data.referrers ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">กำลังโหลด...</p>
      ) : error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : (
        <div className="space-y-4">
          {referrers.map((referrer) => (
            <section
              key={referrer.code}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-xl font-bold">
                    {referrer.name}
                  </p>

                  <p className="text-sm text-[var(--text-muted)]">
                    {formatPhoneForDisplay(referrer.code)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-amber-600">
                    {referrer.points}
                  </p>

                  <p className="text-xs text-[var(--text-muted)]">
                    แนะนำ {referrer.referralCount} คน ·{" "}
                    {REFERRAL_POINTS_PER_CUSTOMER} คะแนน/คน
                  </p>
                </div>
              </div>

              {referrer.recentReferrals.length > 0 && (
                <>
                  <ul className="mt-4 space-y-2">
                    {(expanded[referrer.code]
                      ? referrer.recentReferrals
                      : referrer.recentReferrals.slice(0, 3)
                    ).map((item, index) => (
                      <li
                        key={`${referrer.code}-${index}`}
                        className="rounded-xl bg-[var(--surface-muted)] px-3 py-2"
                      >
                        <p className="font-medium">
                          {item.customerName}
                        </p>

                        <p className="text-xs text-[var(--text-muted)]">
                          {formatPhoneForDisplay(item.customerPhone)}
                        </p>
                      </li>
                    ))}
                  </ul>

                  {referrer.recentReferrals.length > 3 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [referrer.code]: !prev[referrer.code],
                        }))
                      }
                      className="mt-3 w-full rounded-xl border border-[var(--border)] py-2 text-sm font-medium text-[var(--primary)] transition hover:bg-[var(--surface-muted)]"
                    >
                      {expanded[referrer.code]
                        ? "▲ ซ่อน"
                        : `▼ ดูทั้งหมด (${referrer.recentReferrals.length})`}
                    </button>
                  )}
                </>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}