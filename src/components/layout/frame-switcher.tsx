"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppFrame } from "@/components/layout/app-frame";

export function FrameSwitcher({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isRider = pathname.startsWith("/rider");

  if (isAdmin || isRider) return children;
  return <AppFrame>{children}</AppFrame>;
}
