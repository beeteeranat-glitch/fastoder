"use client";

import { useTheme } from "@/context/theme-context";

export function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] shadow-sm transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
      aria-label="สลับธีมสีร้าน"
    >
      <span
        className="h-4 w-4 rounded-full ring-2 ring-white"
        style={{
          background:
            theme === "sky-orange"
              ? "linear-gradient(135deg, #0284c7, #ea580c)"
              : "linear-gradient(135deg, #dc2626, #16a34a)",
        }}
      />
      ธีม
    </button>
  );
}
