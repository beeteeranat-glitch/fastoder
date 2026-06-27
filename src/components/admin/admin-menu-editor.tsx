"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { MenuItemVisual } from "@/components/menu/menu-item-visual";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import { formatPrice } from "@/lib/format";
import type { MenuData } from "@/lib/menu-data";
import { MENU_REALTIME_SUBS } from "@/lib/realtime-subscriptions";
import type { Addon, Category, Product, Topping } from "@/types";

type Tab = "products" | "toppings" | "addons";
const ALL_CATEGORIES = "all";

function newProductTemplate(
  categories: Category[],
  categoryId: string,
): Product {
  const catId =
    categoryId === ALL_CATEGORIES ? categories[0]?.id ?? "" : categoryId;
  return {
    id: "new",
    categoryId: catId,
    name: "",
    description: "",
    basePrice: 0,
    emoji: "🧋",
    gradient: "from-sky-400 to-blue-500",
    isAvailable: true,
    imageUrl: null,
    isRecommended: false,
    isNew: false,
  };
}

export function AdminMenuEditor() {
  const [tab, setTab] = useState<Tab>("products");
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingTopping, setEditingTopping] = useState<Topping | null>(null);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/menu", { cache: "no-store" });
      const data = (await res.json()) as MenuData & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "โหลดเมนูไม่สำเร็จ");
      setMenu(data);
      setCategoryId((current) => current || ALL_CATEGORIES);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดเมนูไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  useRealtimeRefetch(MENU_REALTIME_SUBS, loadMenu);

  const products = useMemo(() => {
    if (!menu) return [];
    if (categoryId === ALL_CATEGORIES) return menu.products;
    return menu.products.filter((product) => product.categoryId === categoryId);
  }, [menu, categoryId]);

  const toggleProductAvailability = async (product: Product) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: !product.isAvailable }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "อัปเดตไม่สำเร็จ");
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ");
    }
  };

  const saveProduct = async () => {
    if (!editingProduct) return;
    if (!editingProduct.name.trim()) {
      setError("กรุณากรอกชื่อเมนู");
      return;
    }
    if (!editingProduct.categoryId) {
      setError("กรุณาเลือกหมวดเมนู");
      return;
    }
    if (editingProduct.basePrice <= 0) {
      setError("กรุณากรอกราคา");
      return;
    }

    const isNew = editingProduct.id === "new";
    setSaving(true);
    setError(null);
    try {
      const payload = {
        category_id: editingProduct.categoryId,
        name: editingProduct.name,
        description: editingProduct.description,
        base_price: editingProduct.basePrice,
        emoji: editingProduct.emoji,
        gradient: editingProduct.gradient,
        is_available: editingProduct.isAvailable,
        is_recommended: editingProduct.isRecommended ?? false,
        is_new: editingProduct.isNew ?? false,
        image_url: editingProduct.imageUrl ?? null,
      };
      const res = await fetch(
        isNew
          ? "/api/admin/products"
          : `/api/admin/products/${editingProduct.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      setEditingProduct(null);
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const saveTopping = async (create = false) => {
    if (!editingTopping) return;
    if (editingTopping.price <= 0) {
      setError("กรุณากรอกราคา");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editingTopping.name,
        price: editingTopping.price,
        image_url: editingTopping.imageUrl ?? null,
        is_available: editingTopping.isAvailable ?? true,
      };
      const res = await fetch(
        create ? "/api/admin/toppings" : `/api/admin/toppings/${editingTopping.id}`,
        {
          method: create ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      setEditingTopping(null);
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const saveAddon = async (create = false) => {
    if (!editingAddon) return;
    if (editingAddon.price <= 0) {
      setError("กรุณากรอกราคา");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editingAddon.name,
        price: editingAddon.price,
        image_url: editingAddon.imageUrl ?? null,
        is_available: editingAddon.isAvailable ?? true,
      };
      const res = await fetch(
        create ? "/api/admin/addons" : `/api/admin/addons/${editingAddon.id}`,
        {
          method: create ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      setEditingAddon(null);
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async () => {
    if (!editingProduct || editingProduct.id === "new") return;
    if (!window.confirm(`ลบเมนู "${editingProduct.name}" ?`)) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "ลบไม่สำเร็จ");
      setEditingProduct(null);
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const deleteTopping = async () => {
    if (!editingTopping || editingTopping.id === "new") return;
    if (!window.confirm(`ลบท็อปปิ้ง "${editingTopping.name}" ?`)) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/toppings/${editingTopping.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "ลบไม่สำเร็จ");
      setEditingTopping(null);
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const deleteAddon = async () => {
    if (!editingAddon || editingAddon.id === "new") return;
    if (!window.confirm(`ลบเอ็ดออน "${editingAddon.name}" ?`)) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/addons/${editingAddon.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "ลบไม่สำเร็จ");
      setEditingAddon(null);
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">กำลังโหลดเมนู...</p>;
  }

  if (!menu) {
    return (
      <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error ?? "โหลดเมนูไม่สำเร็จ"}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["products", "เมนูสินค้า"],
            ["toppings", "ท็อปปิ้ง"],
            ["addons", "เอ็ดออน"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === value
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--surface)] text-[var(--text-muted)] ring-1 ring-[var(--border)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {tab === "products" ? (
        <ProductsTab
          categories={menu.categories}
          products={products}
          allProducts={menu.products}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          onEdit={setEditingProduct}
          onAdd={() =>
            setEditingProduct(newProductTemplate(menu.categories, categoryId))
          }
          onToggleAvailability={(product) => void toggleProductAvailability(product)}
        />
      ) : null}

      {tab === "toppings" ? (
        <ModifierTab
          items={menu.toppings}
          label="ท็อปปิ้ง"
          onEdit={setEditingTopping}
          onAdd={() =>
            setEditingTopping({
              id: "new",
              name: "",
              price: 0,
              imageUrl: null,
              isAvailable: true,
            })
          }
        />
      ) : null}

      {tab === "addons" ? (
        <ModifierTab
          items={menu.addons}
          label="เอ็ดออน"
          onEdit={setEditingAddon}
          onAdd={() =>
            setEditingAddon({
              id: "new",
              name: "",
              price: 0,
              imageUrl: null,
              isAvailable: true,
            })
          }
        />
      ) : null}

      {editingProduct ? (
        <EditModal
          title={editingProduct.id === "new" ? "เพิ่มเมนู" : "แก้ไขเมนู"}
          onClose={() => setEditingProduct(null)}
          onSave={() => void saveProduct()}
          onDelete={
            editingProduct.id === "new" ? undefined : () => void deleteProduct()
          }
          saving={saving}
        >
          <CategorySelect
            categories={menu.categories}
            value={editingProduct.categoryId}
            onChange={(categoryId) =>
              setEditingProduct({ ...editingProduct, categoryId })
            }
          />
          <ImageUploadField
            label="รูปเมนู"
            imageUrl={editingProduct.imageUrl ?? null}
            emoji={editingProduct.emoji}
            gradient={editingProduct.gradient}
            alt={editingProduct.name}
            onChange={(url) =>
              setEditingProduct({ ...editingProduct, imageUrl: url })
            }
          />
          <Field
            label="ชื่อเมนู"
            value={editingProduct.name}
            onChange={(name) => setEditingProduct({ ...editingProduct, name })}
          />
          <Field
            label="คำอธิบาย"
            value={editingProduct.description}
            onChange={(description) =>
              setEditingProduct({ ...editingProduct, description })
            }
          />
          <NumberField
            label="ราคา (บาท)"
            value={editingProduct.basePrice}
            onChange={(basePrice) =>
              setEditingProduct({ ...editingProduct, basePrice })
            }
          />
          <Field
            label="อีโมจิ (ถ้าไม่มีรูป)"
            value={editingProduct.emoji}
            onChange={(emoji) => setEditingProduct({ ...editingProduct, emoji })}
          />
          <AvailabilitySwitch
            checked={editingProduct.isAvailable}
            onChange={(isAvailable) =>
              setEditingProduct({ ...editingProduct, isAvailable })
            }
          />
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={editingProduct.isRecommended ?? false}
                onChange={(event) =>
                  setEditingProduct({
                    ...editingProduct,
                    isRecommended: event.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-[var(--border)]"
              />
              แนะนำ (Best Seller)
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={editingProduct.isNew ?? false}
                onChange={(event) =>
                  setEditingProduct({
                    ...editingProduct,
                    isNew: event.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-[var(--border)]"
              />
              เมนูใหม่
            </label>
          </div>
        </EditModal>
      ) : null}

      {editingTopping ? (
        <EditModal
          title={editingTopping.id === "new" ? "เพิ่มท็อปปิ้ง" : "แก้ไขท็อปปิ้ง"}
          onClose={() => setEditingTopping(null)}
          onSave={() => void saveTopping(editingTopping.id === "new")}
          onDelete={
            editingTopping.id === "new" ? undefined : () => void deleteTopping()
          }
          saving={saving}
        >
          <ModifierForm item={editingTopping} onChange={setEditingTopping} />
        </EditModal>
      ) : null}

      {editingAddon ? (
        <EditModal
          title={editingAddon.id === "new" ? "เพิ่มเอ็ดออน" : "แก้ไขเอ็ดออน"}
          onClose={() => setEditingAddon(null)}
          onSave={() => void saveAddon(editingAddon.id === "new")}
          onDelete={
            editingAddon.id === "new" ? undefined : () => void deleteAddon()
          }
          saving={saving}
        >
          <ModifierForm item={editingAddon} onChange={setEditingAddon} />
        </EditModal>
      ) : null}
    </div>
  );
}

function ProductsTab({
  categories,
  products,
  allProducts,
  categoryId,
  onCategoryChange,
  onEdit,
  onAdd,
  onToggleAvailability,
}: {
  categories: Category[];
  products: Product[];
  allProducts: Product[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
  onEdit: (product: Product) => void;
  onAdd: () => void;
  onToggleAvailability: (product: Product) => void;
}) {
  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <CategorySelect
          categories={categories}
          value={categoryId}
          onChange={onCategoryChange}
          includeAll
          label="หมวดเมนู"
          className="min-w-0 flex-1"
          hint={
            categoryId === ALL_CATEGORIES
              ? `ทั้งหมด ${allProducts.length} รายการ`
              : `${products.length} รายการ`
          }
        />
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          + เพิ่มเมนู
        </button>
      </div>
      <div className="space-y-2">
        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            ยังไม่มีเมนูในหมวดนี้
          </p>
        ) : null}
        {products.map((product) => {
          const category = categoryMap.get(product.categoryId);
          return (
            <div
              key={product.id}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <MenuItemVisual
                imageUrl={product.imageUrl}
                emoji={product.emoji}
                gradient={product.gradient}
                alt={product.name}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--text)]">{product.name}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {categoryId === ALL_CATEGORIES && category
                    ? `${category.emoji} ${category.name} · `
                    : ""}
                  {formatPrice(product.basePrice)}
                  <AvailabilityStatus isAvailable={product.isAvailable} />
                  {product.isRecommended ? (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      แนะนำ
                    </span>
                  ) : null}
                  {product.isNew ? (
                    <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
                      ใหม่
                    </span>
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggleAvailability(product)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                  product.isAvailable
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                }`}
              >
                {product.isAvailable ? "เปิดขาย" : "ปิดขาย"}
              </button>
              <button
                type="button"
                onClick={() => onEdit(product)}
                className="rounded-xl bg-[var(--primary-soft)] px-3 py-2 text-sm font-semibold text-[var(--primary)]"
              >
                แก้ไข
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategorySelect({
  categories,
  value,
  onChange,
  includeAll = false,
  label = "หมวดเมนู",
  hint,
  className,
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
  label?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 flex items-baseline justify-between gap-2 text-xs font-semibold text-[var(--text-muted)]">
        <span>{label}</span>
        {hint ? <span className="font-normal">{hint}</span> : null}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
      >
        {includeAll ? <option value={ALL_CATEGORIES}>ทั้งหมด</option> : null}
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.emoji} {category.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModifierTab({
  items,
  label,
  onEdit,
  onAdd,
}: {
  items: (Topping | Addon)[];
  label: string;
  onEdit: (item: Topping | Addon) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onAdd}
        className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
      >
        + เพิ่ม{label}
      </button>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"
          >
            <MenuItemVisual
              imageUrl={item.imageUrl}
              emoji="🧋"
              gradient="from-amber-300 to-orange-400"
              size="sm"
              alt={item.name}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--text)]">{item.name}</p>
              <p className="text-sm text-[var(--text-muted)]">
                {formatPrice(item.price)}
                <AvailabilityStatus isAvailable={item.isAvailable !== false} />
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="rounded-xl bg-[var(--primary-soft)] px-3 py-2 text-sm font-semibold text-[var(--primary)]"
            >
              แก้ไข
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModifierForm({
  item,
  onChange,
}: {
  item: Topping | Addon;
  onChange: (item: Topping | Addon) => void;
}) {
  return (
    <>
      <ImageUploadField
        label="รูป"
        imageUrl={item.imageUrl ?? null}
        alt={item.name}
        onChange={(url) => onChange({ ...item, imageUrl: url })}
      />
      <Field
        label="ชื่อ"
        value={item.name}
        onChange={(name) => onChange({ ...item, name })}
      />
      <NumberField
        label="ราคา (บาท)"
        value={item.price}
        onChange={(price) => onChange({ ...item, price })}
      />
      <AvailabilitySwitch
        checked={item.isAvailable !== false}
        onChange={(isAvailable) => onChange({ ...item, isAvailable })}
      />
    </>
  );
}

function EditModal({
  title,
  children,
  onClose,
  onSave,
  onDelete,
  saving,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[var(--surface)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-sm font-semibold">
            ปิด
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="w-full rounded-2xl bg-[var(--primary)] py-3 font-bold text-white disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
          {onDelete ? (
            <button
              type="button"
              disabled={saving}
              onClick={onDelete}
              className="w-full rounded-2xl border border-rose-200 bg-rose-50 py-3 font-bold text-rose-700 disabled:opacity-60"
            >
              ลบรายการ
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function AvailabilitySwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
      <span className="text-xs font-semibold text-[var(--text-muted)]">
        สถานะขาย
      </span>
      <div className="flex items-center gap-2.5">
        <span
          className={
            checked
              ? "text-sm font-semibold text-emerald-600"
              : "text-sm font-semibold text-red-600"
          }
        >
          {checked ? "เปิดขาย" : "ปิดขาย"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={checked ? "เปิดขาย" : "ปิดขาย"}
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

function AvailabilityStatus({ isAvailable }: { isAvailable: boolean }) {
  return (
    <>
      {" · "}
      <span
        className={
          isAvailable
            ? "font-semibold text-emerald-600"
            : "font-semibold text-red-600"
        }
      >
        {isAvailable ? "เปิดขาย" : "ปิดขาย"}
      </span>
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(() => (value === 0 ? "" : String(value)));

  useEffect(() => {
    setText(value === 0 ? "" : String(value));
  }, [value]);

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          if (next !== "" && !/^\d+$/.test(next)) return;
          setText(next);
          onChange(next === "" ? 0 : Number(next));
        }}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
      />
    </label>
  );
}
