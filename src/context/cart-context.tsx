"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Addon, CartItem, CartItemOptions, Product, Topping } from "@/types";

interface AddToCartPayload {
  product: Product;
  quantity: number;
  options: CartItemOptions;
  toppings: Topping[];
  addons: Addon[];
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  addItem: (payload: AddToCartPayload) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const CART_STORAGE_KEY = "fastorder-cart-items";

function createCartItemId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readStoredCartItems() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);

  useEffect(() => {
    setItems(readStoredCartItems());
    setCartLoaded(true);
  }, []);

  useEffect(() => {
    if (!cartLoaded || typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, cartLoaded]);

  const addItem = useCallback((payload: AddToCartPayload) => {
    setItems((current) => [
      ...current,
      {
        id: createCartItemId(),
        productId: payload.product.id,
        name: payload.product.name,
        basePrice: payload.product.basePrice,
        quantity: payload.quantity,
        options: payload.options,
        toppings: payload.toppings,
        addons: payload.addons,
        emoji: payload.product.emoji,
        gradient: payload.product.gradient,
      },
    ]);
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((current) => current.filter((item) => item.id !== id));
      return;
    }
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity } : item)),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [items, itemCount, addItem, updateQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
