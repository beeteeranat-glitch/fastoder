"use client";

import { CartProvider } from "@/context/cart-context";
import { ThemeProvider } from "@/context/theme-context";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <CartProvider>{children}</CartProvider>
    </ThemeProvider>
  );
}
