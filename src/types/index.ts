export type ThemeId = "sky-orange" | "red-green";

export interface Category {
  id: string;
  name: string;
  description: string;
  emoji: string;
  imageUrl?: string | null;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number;
  gradient: string;
  emoji: string;
  isAvailable: boolean;
  isRecommended?: boolean;
  isNew?: boolean;
  createdAt?: string;
  imageUrl?: string | null;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
}

export interface CartItemOptions {
  blended: boolean;
  largeCup: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  options: CartItemOptions;
  toppings: Topping[];
  addons: Addon[];
  emoji: string;
  gradient: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  deliveryRadius: number;
}
