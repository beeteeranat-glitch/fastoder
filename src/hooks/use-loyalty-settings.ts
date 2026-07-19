"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_LOYALTY_SETTINGS,
  type LoyaltySettings,
} from "@/lib/loyalty";

export function useLoyaltySettings() {
  const [settings, setSettings] = useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS);

  useEffect(() => {
    void fetch("/api/loyalty-settings", { cache: "no-store" })
      .then(async (response) => (response.ok ? (await response.json()) as LoyaltySettings : null))
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch(() => undefined);
  }, []);

  return settings;
}
