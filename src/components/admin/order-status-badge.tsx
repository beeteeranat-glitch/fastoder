import type { DbOrderStatus } from "@/types/database";
import { ORDER_STATUS_LABELS } from "@/lib/orders";

const STATUS_STYLES: Record<DbOrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 ring-amber-200",
  CONFIRMED: "bg-sky-100 text-sky-800 ring-sky-200",
  PREPARING: "bg-violet-100 text-violet-800 ring-violet-200",
  READY_FOR_DELIVERY: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  DELIVERING: "bg-cyan-100 text-cyan-800 ring-cyan-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-800 ring-rose-200",
};

export function OrderStatusBadge({ status }: { status: DbOrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
