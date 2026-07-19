"use client";

import { useCallback, useEffect, useState } from "react";

function normalizeSeconds(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.ceil(value))
    : 0;
}

export function formatLockCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function useLoginLockout(statusUrl: string, enabled = true) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const setLockFromResponse = useCallback((seconds: unknown) => {
    setRemainingSeconds(normalizeSeconds(seconds));
  }, []);

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [remainingSeconds]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void fetch(statusUrl, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { retryAfterSeconds?: unknown };
        if (!cancelled) setLockFromResponse(data.retryAfterSeconds);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [enabled, setLockFromResponse, statusUrl]);

  return {
    isLocked: remainingSeconds > 0,
    remainingSeconds,
    countdown: formatLockCountdown(remainingSeconds),
    setLockFromResponse,
  };
}
