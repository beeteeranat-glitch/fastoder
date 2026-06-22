"use client";

import { useTheme } from "@/context/theme-context";
import { useEffect } from "react";

export function ThemeApplier() {
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
