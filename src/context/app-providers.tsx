"use client";

import { CartProvider } from "@/context/cart-context";
import { CustomerAuthProvider } from "@/context/customer-auth-context";
import { ShopProvider } from "@/context/shop-context";
import { ThemeProvider } from "@/context/theme-context";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ShopProvider>
        <CustomerAuthProvider>
          <CartProvider>{children}</CartProvider>
        </CustomerAuthProvider>
      </ShopProvider>
    </ThemeProvider>
  );
}
