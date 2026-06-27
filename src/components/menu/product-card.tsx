import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";
import { MenuItemVisual } from "@/components/menu/menu-item-visual";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <article className="menu-row group flex items-center gap-3 p-3 sm:gap-4 sm:p-3.5">
      <MenuItemVisual
        imageUrl={product.imageUrl}
        emoji={product.emoji}
        gradient={product.gradient}
        alt={product.name}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--text)] sm:text-[15px]">
          {product.name}
        </p>
        {product.description ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">
            {product.description}
          </p>
        ) : null}
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
