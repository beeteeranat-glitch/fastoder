"use client";

import { useCallback, useEffect, useState } from "react";
import { formatOrderDate } from "@/lib/orders";

type RedemptionRow = {
  id: string;
  points_used: number;
  reward_type: string;
  created_at: string;
  customers?: { name?: string; phone?: string } | null;
};

export function AdminRewardsBoard() {
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rewards");
      const data = (await res.json()) as {
        redemptions?: RedemptionRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "โหลดไม่สำเร็จ");
      setRedemptions(data.redemptions ?? []);
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

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">กำลังโหลด...</p>;
  }

  if (error) {
    return (
      <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {error}
      </p>
    );
  }

  if (redemptions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">
        ยังไม่มีประวัติการแลกรางวัล
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {redemptions.map((row) => (
        <li
          key={row.id}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
        >
          <p className="font-semibold">
            {row.customers?.name ?? "ลูกค้า"} · แลกเครื่องดื่มฟรี
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            ใช้ {row.points_used} คะแนน · {formatOrderDate(row.created_at)}
          </p>
        </li>
      ))}
    </ul>
  );
}
