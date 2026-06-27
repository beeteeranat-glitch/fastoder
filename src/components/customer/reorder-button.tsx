"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/context/cart-context";
import type { Addon, Product, Topping } from "@/types";
import type { DbOrderItem } from "@/types/database";

export function ReorderButton({ items }: { items: DbOrderItem[] }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reorder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/menu", { cache: "no-store" });
      const menu = (await res.json()) as {
        products?: Product[];
        toppings?: Topping[];
        addons?: Addon[];
      };

      const products = menu.products ?? [];
      const toppings = menu.toppings ?? [];
      const addons = menu.addons ?? [];
      let added = 0;

      for (const item of items) {
        const product = products.find((p) => p.id === item.product_id);
        if (!product || !product.isAvailable) continue;

        const options = item.options as {
          blended?: boolean;
          largeCup?: boolean;
        };
        const itemToppings = (item.toppings as { id?: string; name?: string }[])
          .map((t) => toppings.find((top) => top.id === t.id || top.name === t.name))
          .filter((t): t is Topping => Boolean(t));
        const itemAddons = (item.addons as { id?: string; name?: string }[])
          .map((a) => addons.find((ad) => ad.id === a.id || ad.name === a.name))
          .filter((a): a is Addon => Boolean(a));

        addItem({
          product,
          quantity: item.quantity,
          options: {
            blended: Boolean(options.blended),
            largeCup: Boolean(options.largeCup),
          },
          toppings: itemToppings,
          addons: itemAddons,
        });
        added += 1;
      }

      if (added === 0) {
        throw new Error("ไม่สามารถสั่งซ้ำได้ — เมนูอาจปิดขายแล้ว");
      }

      router.push("/cart");
    } catch (err) {
      setError(err instanceof Error ? err.message : "สั่งซ้ำไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void reorder()}
        className="rounded-2xl bg-[var(--secondary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? "กำลังเพิ่ม..." : "สั่งซ้ำออเดอร์นี้"}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}
