import type { ReactNode } from "react";

interface ShellProps {
  children: ReactNode;
  className?: string;
}

export function PageShell({ children, className = "" }: ShellProps) {
  return (
    <div
      className={`flex min-h-dvh w-full min-w-0 flex-col bg-[var(--surface-muted)] lg:min-h-0 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="glass-panel sticky top-0 z-30 border-b border-[var(--border)]">
      <div className="h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--primary)]" />
      <div className="flex items-start justify-between gap-3 px-4 pb-5 pt-4 sm:px-5 md:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--primary)]">
            FastOrder
          </p>
          <h1 className="font-display text-balance mt-1 text-2xl font-bold text-[var(--text)] sm:text-[1.75rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function PageContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full min-w-0 max-w-3xl px-4 sm:px-5 md:px-6 lg:max-w-none lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}
