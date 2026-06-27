export type DbOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_DELIVERY"
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED";

export type DbRestaurant = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  delivery_radius_meters: number;
  delivery_min_meters: number;
  delivery_block_meters: number;
  logo_url: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  payment_qr_url: string | null;
  created_at: string;
};

export type DbDeliveryFeeTier = {
  id: string;
  restaurant_id: string;
  distance_meters: number;
  fee_baht: number;
  sort_order: number;
  created_at: string;
};

export type PromoDiscountType =
  | "percent_food"
  | "fixed_total"
  | "free_delivery";

export type DbPromoCode = {
  id: string;
  restaurant_id: string;
  code: string;
  label: string;
  discount_type: PromoDiscountType;
  discount_value: number;
  min_order_amount: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  created_at: string;
  updated_at: string;
};

export type DbCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
};

export type DbProduct = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: number;
  emoji: string | null;
  gradient: string | null;
  image_url: string | null;
  is_available: boolean;
  is_recommended?: boolean;
  is_new?: boolean;
  sort_order: number;
  created_at: string;
};

export type DbTopping = {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  image_url: string | null;
  sort_order: number;
  is_available: boolean;
  created_at: string;
};

export type DbAddon = {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  image_url: string | null;
  sort_order: number;
  is_available: boolean;
  created_at: string;
};

export type DbOrder = {
  id: string;
  order_number: string;
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  customer_note: string | null;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  distance_meters: number | null;
  food_total: number;
  delivery_fee: number;
  discount_total: number;
  payable_total: number;
  payment_method: "cash" | "transfer";
  payment_slip_url: string | null;
  promo_code: string | null;
  referrer_code: string | null;
  points_earned?: number;
  points_redeemed?: number;
  reward_discount?: number;
  reward_redemption_id?: string | null;
  status: DbOrderStatus;
  created_at: string;
  updated_at: string;
};

export type DbOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  options: Record<string, unknown>;
  toppings: unknown[];
  addons: unknown[];
  line_total: number;
  created_at: string;
};

export type DbReferrer = {
  id: string;
  restaurant_id: string;
  phone: string;
  name: string;
  reward_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbCustomer = {
  id: string;
  restaurant_id: string;
  phone: string;
  name: string;
  notes: string | null;
  default_address?: string | null;
  points?: number;
  order_count: number;
  total_spent: number;
  first_order_at: string | null;
  last_order_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbPointTransaction = {
  id: string;
  restaurant_id: string;
  customer_id: string;
  order_id: string | null;
  points: number;
  type: "earn" | "redeem";
  description: string | null;
  created_at: string;
};

export type DbRewardRedemption = {
  id: string;
  restaurant_id: string;
  customer_id: string;
  order_id: string | null;
  points_used: number;
  reward_type: string;
  created_at: string;
};
