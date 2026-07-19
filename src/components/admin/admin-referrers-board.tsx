"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPhoneForDisplay } from "@/lib/phone";
import {
  type ReferrerStat,
} from "@/lib/referrers";
import {
  DEFAULT_LOYALTY_SETTINGS,
  type LoyaltySettings,
} from "@/lib/loyalty";

export function AdminReferrersBoard() {
  const [referrers, setReferrers] = useState<ReferrerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [res, settingsRes] = await Promise.all([
        fetch("/api/admin/referrers"),
        fetch("/api/admin/loyalty-settings", { cache: "no-store" }),
      ]);

      const data = (await res.json()) as {
        referrers?: ReferrerStat[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "โหลดไม่สำเร็จ");
      }

      setReferrers(data.referrers ?? []);
      if (settingsRes.ok) {
        const settingsData = (await settingsRes.json()) as { settings?: LoyaltySettings };
        setSettings(settingsData.settings ?? DEFAULT_LOYALTY_SETTINGS);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSetting = (key: keyof LoyaltySettings, value: string) => {
    setSettings((current) => ({
      ...current,
      [key]: value.replace(/\D/g, ""),
    } as LoyaltySettings));
  };

  const saveSettings = async () => {
    const nextSettings = {
      earnSpendAmount: Number(settings.earnSpendAmount),
      earnPoints: Number(settings.earnPoints),
      redemptionPoints: Number(settings.redemptionPoints),
    };
    if (Object.values(nextSettings).some((value) => !Number.isInteger(value) || value < 1)) {
      setSettingsMessage("กรุณากรอกทุกช่องเป็นจำนวนเต็มบวก");
      return;
    }

    setSavingSettings(true);
    setSettingsMessage(null);
    try {
      const res = await fetch("/api/admin/loyalty-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      });
      const data = (await res.json()) as { settings?: LoyaltySettings; error?: string };
      if (!res.ok || !data.settings) {
        throw new Error(data.error ?? "บันทึกการตั้งค่าไม่สำเร็จ");
      }
      setSettings(data.settings);
      setSettingsMessage("บันทึกการตั้งค่าคะแนนแล้ว");
    } catch (err) {
      setSettingsMessage(err instanceof Error ? err.message : "บันทึกการตั้งค่าไม่สำเร็จ");
    } finally {
      setSavingSettings(false);
    }
  };

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
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-display text-lg font-bold text-[var(--text)]">
              การตั้งค่าคะแนน
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              กำหนดคะแนนสะสมจากการสั่งซื้อ และคะแนนที่ใช้แลกเครื่องดื่มฟรี 1 แก้ว
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                  ใช้จ่ายทุก (บาท)
                </span>
                <input
                  inputMode="numeric"
                  value={settings.earnSpendAmount}
                  onChange={(event) => updateSetting("earnSpendAmount", event.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm tabular-nums"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                  ได้รับ (คะแนน)
                </span>
                <input
                  inputMode="numeric"
                  value={settings.earnPoints}
                  onChange={(event) => updateSetting("earnPoints", event.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm tabular-nums"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                  แลก 1 สิทธิ์ (คะแนน)
                </span>
                <input
                  inputMode="numeric"
                  value={settings.redemptionPoints}
                  onChange={(event) => updateSetting("redemptionPoints", event.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm tabular-nums"
                />
              </label>
            </div>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              ลูกค้าใช้จ่ายทุก {settings.earnSpendAmount || 0} บาท จะได้ {settings.earnPoints || 0} คะแนน · ใช้ {settings.redemptionPoints || 0} คะแนน แลกเครื่องดื่มฟรี 1 แก้ว
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={savingSettings}
                onClick={() => void saveSettings()}
                className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingSettings ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
              </button>
              {settingsMessage ? (
                <p className="text-sm text-[var(--text-muted)]">{settingsMessage}</p>
              ) : null}
            </div>
          </section>
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
                    10 คะแนน/คน
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
