"use client";

import { useMemo, useState } from "react";
import { SIZE_OPTIONS } from "@/data/menu";
import { useCart } from "@/context/cart-context";
import { MenuItemVisual } from "@/components/menu/menu-item-visual";
import { calcItemUnitPrice, formatPrice } from "@/lib/format";
import type { Addon, Product, Topping } from "@/types";

interface ProductSheetProps {
  product: Product | null;
  toppings: Topping[];
  addons: Addon[];
  onClose: () => void;
}

function toggleItem<T extends { id: string }>(list: T[], item: T) {
  return list.some((entry) => entry.id === item.id)
    ? list.filter((entry) => entry.id !== item.id)
    : [...list, item];
}

export function ProductSheet({
  product,
  toppings: toppingOptions,
  addons: addonOptions,
  onClose,
}: ProductSheetProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [blended, setBlended] = useState(false);
  const [largeCup, setLargeCup] = useState(false);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    return calcItemUnitPrice(
      product.basePrice,
      { blended, largeCup },
      toppings,
      addons,
    );
  }, [product, blended, largeCup, toppings, addons]);

  if (!product) return null;

  const handleAdd = () => {
    addItem({
      product,
      quantity,
      options: { blended, largeCup },
      toppings,
      addons,
    });
    onClose();
    setQuantity(1);
    setBlended(false);
    setLargeCup(false);
    setToppings([]);
    setAddons([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4 md:p-6">
      <button
        type="button"
        aria-label="ปิด"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 pb-[calc(env(safe-area-inset-bottom,1rem)+1rem)] shadow-2xl sm:max-w-xl sm:rounded-3xl md:max-w-2xl md:p-6">
        <div className="mb-4 flex justify-center">
          <MenuItemVisual
            imageUrl={product.imageUrl}
            emoji={product.emoji}
            gradient={product.gradient}
            size="lg"
            alt={product.name}
          />
        </div>

        <div className="mb-5">
          <h2 className="font-display text-2xl font-bold text-[var(--text)]">
            {product.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {product.description}
          </p>
          <p className="mt-2 text-lg font-bold text-[var(--primary)]">
            เริ่มต้น {formatPrice(product.basePrice)}
          </p>
        </div>

        <OptionGroup title="ขนาดและรูปแบบ">
          <ToggleChip
            label={`${SIZE_OPTIONS.blended.label} (+${SIZE_OPTIONS.blended.price})`}
            active={blended}
            onClick={() => setBlended((value) => !value)}
          />
          <ToggleChip
            label={`${SIZE_OPTIONS.largeCup.label} (+${SIZE_OPTIONS.largeCup.price})`}
            active={largeCup}
            onClick={() => setLargeCup((value) => !value)}
          />
        </OptionGroup>

        <OptionGroup title="Topping">
          <div className="flex flex-wrap gap-2">
            {toppingOptions.map((topping) => (
              <ToggleChip
                key={topping.id}
                label={`${topping.name} (+${topping.price})`}
                active={toppings.some((entry) => entry.id === topping.id)}
                onClick={() => setToppings((current) => toggleItem(current, topping))}
              />
            ))}
          </div>
        </OptionGroup>

        <OptionGroup title="Add-on">
          <div className="flex flex-wrap gap-2">
            {addonOptions.map((addon) => (
              <ToggleChip
                key={addon.id}
                label={`${addon.name} (+${addon.price})`}
                active={addons.some((entry) => entry.id === addon.id)}
                onClick={() => setAddons((current) => toggleItem(current, addon))}
              />
            ))}
          </div>
        </OptionGroup>

        <div className="mt-6 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
          <span className="text-sm font-medium text-[var(--text-muted)]">
            จำนวน
          </span>
          <div className="flex items-center gap-3">
            <RoundButton
              label="-"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            />
            <span className="w-6 text-center font-bold">{quantity}</span>
            <RoundButton
              label="+"
              onClick={() => setQuantity((value) => value + 1)}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="btn-primary mt-4 flex w-full items-center justify-center gap-2 px-4 py-4 text-base"
        >
          เพิ่มลงตะกร้า {formatPrice(unitPrice * quantity)}
        </button>
      </div>
    </div>
  );
}

function OptionGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <h3 className="mb-2 text-sm font-bold text-[var(--text)]">{title}</h3>
      {children}
    </section>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
        active
          ? "bg-[var(--secondary)] text-white"
          : "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]"
      }`}
    >
      {label}
    </button>
  );
}

function RoundButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-lg font-bold text-[var(--text)]"
    >
      {label}
    </button>
  );
}
