import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <article className="menu-row group flex items-center gap-3 p-3 sm:gap-4 sm:p-3.5">
      <div
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:h-16 sm:w-16 ${product.gradient}`}
        aria-hidden
      >
        <span className="text-2xl drop-shadow-sm transition group-hover:scale-110 sm:text-3xl">
          {product.emoji}
        </span>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--text)] sm:text-[15px]">
          {product.name}
        </p>
        <p className="mt-0.5 hidden truncate text-xs text-[var(--text-muted)] sm:block">
          {product.description}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-sm font-bold text-[var(--primary)]">
          {formatPrice(product.basePrice)}
        </span>
        <button
          type="button"
          onClick={() => onSelect(product)}
          className="btn-primary px-3.5 py-2 text-sm sm:px-4"
        >
          เลือก
        </button>
      </div>
    </article>
  );
}
