"use client";

import Link from "next/link";
import { useCart } from "@/context/cart-context";
import {
  calcCartTotal,
  calcItemUnitPrice,
  formatPrice,
} from "@/lib/format";
import { SIZE_OPTIONS } from "@/data/menu";

export function CartView() {
  const { items, updateQuantity, removeItem } = useCart();
  const total = calcCartTotal(items);

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 text-5xl">🛒</div>
        <h2 className="font-display text-xl font-bold text-[var(--text)]">
          ตะกร้าว่างอยู่
        </h2>
        <p className="mt-2 max-w-xs text-sm text-[var(--text-muted)]">
          เลือกเครื่องดื่มจากเมนูแล้วเพิ่มลงตะกร้าเพื่อเริ่มสั่งซื้อ
        </p>
        <Link
          href="/menu"
          className="mt-6 rounded-2xl bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--primary)]/25"
        >
          ไปเลือกเมนู
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-1">
        {items.map((item) => {
          const unitPrice = calcItemUnitPrice(
            item.basePrice,
            item.options,
            item.toppings,
            item.addons,
          );

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
            >
              <div className="flex gap-3">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} text-2xl`}
                >
                  {item.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-[var(--text)]">
                      {item.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--secondary)]"
                    >
                      ลบ
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {[
                      item.options.blended ? SIZE_OPTIONS.blended.label : null,
                      item.options.largeCup
                        ? SIZE_OPTIONS.largeCup.label
                        : null,
                      ...item.toppings.map((topping) => topping.name),
                      ...item.addons.map((addon) => addon.name),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "ปกติ"}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)]"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-sm font-bold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)]"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-bold text-[var(--primary)]">
                      {formatPrice(unitPrice * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--surface)] py-4 lg:sticky lg:top-24 lg:rounded-2xl lg:border lg:p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-[var(--text-muted)]">ยอดรวม</span>
          <span className="font-display text-2xl font-bold text-[var(--text)]">
            {formatPrice(total)}
          </span>
        </div>
        <Link
          href="/checkout"
          className="flex w-full items-center justify-center rounded-2xl bg-[var(--primary)] px-4 py-4 text-base font-bold text-white shadow-lg shadow-[var(--primary)]/30"
        >
          ดำเนินการสั่งซื้อ
        </Link>
      </div>
    </div>
  );
}
