"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/cart-context";

const NAV_ITEMS = [
  { href: "/menu", label: "เมนู", icon: "🍹" },
  { href: "/cart", label: "ตะกร้า", icon: "🛒" },
  { href: "/order/demo", label: "ติดตาม", icon: "📦" },
];

type NavVariant = "bottom" | "sidebar";

export function BottomNav({ variant = "bottom" }: { variant?: NavVariant }) {
  const pathname = usePathname();
  const { itemCount } = useCart();

  if (pathname === "/") return null;

  const isSidebar = variant === "sidebar";

  return (
    <nav
      className={
        isSidebar
          ? "flex flex-col gap-1.5"
          : "border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 sm:px-4"
      }
    >
      <div
        className={
          isSidebar ? "flex flex-col gap-1.5" : "grid grid-cols-3 gap-1.5"
        }
      >
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-2xl font-semibold transition ${
                isSidebar
                  ? `gap-3 px-3 py-3 text-sm ${
                      active
                        ? "bg-[var(--primary)] text-white shadow-[0_10px_24px_-14px_rgb(var(--shadow-color)/0.8)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--text)]"
                    }`
                  : `flex-col px-2 py-2 text-[11px] ${
                      active
                        ? "bg-[var(--primary)] text-white shadow-[0_10px_24px_-14px_rgb(var(--shadow-color)/0.8)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--primary-soft)]"
                    }`
              }`}
            >
              <span className="relative inline-flex shrink-0">
                <span className={isSidebar ? "text-xl" : "text-lg leading-none"}>
                  {item.icon}
                </span>
                {item.href === "/cart" && itemCount > 0 ? (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--secondary)] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--surface)]">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                ) : null}
              </span>
              <span className={isSidebar ? "" : "mt-0.5"}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
