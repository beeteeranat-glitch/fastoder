export function ToggleSwitch({
  label,
  checked,
  onLabel,
  offLabel,
  onChange,
}: {
  label: string;
  checked: boolean;
  onLabel: string;
  offLabel: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
      <span className="text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      <div className="flex items-center gap-2.5">
        <span
          className={
            checked
              ? "text-sm font-semibold text-emerald-600"
              : "text-sm font-semibold text-red-600"
          }
        >
          {checked ? onLabel : offLabel}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={checked ? onLabel : offLabel}
          onClick={() => onChange(!checked)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            checked ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
