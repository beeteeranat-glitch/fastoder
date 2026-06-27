"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { useAdminOrderAlerts } from "@/context/admin-order-alerts-context";
import {
  ADMIN_PAGES,
  getAdminPageMeta,
  isAdminNavActive,
} from "@/lib/admin-pages";

function formatBadge(count: number) {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

function NavBadge({
  count,
  active,
  className = "",
}: {
  count: number;
  active?: boolean;
  className?: string;
}) {
  const label = formatBadge(count);
  if (!label) return null;

  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm ${active ? "ring-2 ring-white/80" : "ring-2 ring-[var(--surface)]"} ${className}`}
      aria-label={`ออเดอร์ใหม่ ${label} รายการ`}
    >
      {label}
    </span>
  );
}

function DesktopNavLink({
  href,
  label,
  icon,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  badge?: number;
  onNavigate: (href: string, active: boolean, event: MouseEvent) => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={(event) => onNavigate(href, active, event)}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-[var(--primary)] text-white shadow-sm"
          : "text-[var(--text-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--text)]"
      }`}
    >
      <span
        className={`relative flex h-8 w-8 items-center justify-center rounded-lg text-base transition ${
          active
            ? "bg-white/15"
            : "bg-[var(--surface-muted)] ring-1 ring-[var(--border)] group-hover:bg-white"
        }`}
      >
        {icon}
        {badge ? (
          <NavBadge
            count={badge}
            active={active}
            className="absolute -right-2 -top-2"
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
    </Link>
  );
}

function MobileNavLink({
  href,
  label,
  icon,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  badge?: number;
  onNavigate: (href: string, active: boolean, event: MouseEvent) => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={(event) => onNavigate(href, active, event)}
      className={`relative snap-start flex min-w-[4.75rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl px-2.5 py-2 transition active:scale-[0.98] ${
        active
          ? "bg-[var(--primary)] text-white shadow-md"
          : "text-[var(--text-muted)] hover:bg-[var(--primary-soft)]/70 hover:text-[var(--text)]"
      }`}
      style={
        active
          ? { boxShadow: "0 8px 20px -6px rgba(var(--shadow-color), 0.45)" }
          : undefined
      }
    >
      <span
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-lg leading-none transition ${
          active
            ? "bg-white/18"
            : "bg-[var(--surface)] ring-1 ring-[var(--border)]"
        }`}
      >
        {icon}
        {badge ? (
          <NavBadge
            count={badge}
            active={active}
            className="absolute -right-2 -top-2"
          />
        ) : null}
      </span>
      <span className="max-w-[4.5rem] truncate text-center text-[10px] font-bold leading-tight">
        {label}
      </span>
    </Link>
  );
}

export function AdminShell({
  action,
  children,
}: {
  action?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { pendingCount } = useAdminOrderAlerts();
  const [contentKey, setContentKey] = useState(0);
  const { title, subtitle } = getAdminPageMeta(pathname);
  const ordersBadge = pendingCount;

  useEffect(() => {
    setContentKey(0);
    window.scrollTo(0, 0);
  }, [pathname]);

  const handleNavClick = (
    _href: string,
    active: boolean,
    event: MouseEvent,
  ) => {
    if (!active) return;
    event.preventDefault();
    setContentKey((value) => value + 1);
    router.refresh();
  };

  return (
    <div className="flex min-h-dvh bg-[var(--surface-muted)] lg:min-h-full">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-4 py-6 lg:flex">
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Admin
          </p>
          <p className="font-display mt-1 text-lg font-bold">FastOrder</p>
          <p className="mt-1 text-xs text-white/70">จัดการร้าน</p>
        </div>
        <nav className="mt-6 flex flex-col gap-1.5">
          {ADMIN_PAGES.map((item) => (
            <DesktopNavLink
              key={item.href}
              href={item.href}
              label={item.navLabel}
              icon={item.icon}
              active={isAdminNavActive(pathname, item.href, item.exact)}
              badge={item.href === "/admin/orders" ? ordersBadge : undefined}
              onNavigate={handleNavClick}
            />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--primary)] lg:hidden">
                Admin
              </p>
              <h1 className="font-display text-2xl font-bold text-[var(--text)]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {action}
          </div>

          <nav
            aria-label="เมนูแอดมิน"
            className="border-t border-[var(--border)] bg-[var(--surface-muted)]/80 backdrop-blur-sm lg:hidden"
          >
            <div className="scrollbar-hide overflow-x-auto">
              <div className="mx-auto flex w-max min-w-full snap-x snap-mandatory justify-center gap-2.5 px-5 py-3 sm:gap-3 sm:px-6">
                {ADMIN_PAGES.map((item) => (
                  <MobileNavLink
                    key={item.href}
                    href={item.href}
                    label={item.navLabel}
                    icon={item.icon}
                    active={isAdminNavActive(pathname, item.href, item.exact)}
                    badge={
                      item.href === "/admin/orders" ? ordersBadge : undefined
                    }
                    onNavigate={handleNavClick}
                  />
                ))}
              </div>
            </div>
          </nav>
        </header>

        <main
          key={`${pathname}-${contentKey}`}
          className="flex-1 px-4 py-5 sm:px-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
