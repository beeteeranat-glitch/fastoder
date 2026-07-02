import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { RESTAURANT } from "@/data/menu";
import {
  calcDeliveryFeeFromSettings,
  calcDeliveryMinimumSurcharge,
  isDeliverableFromSettings,
} from "@/lib/delivery-fee";
import {
  fetchDeliverySettingsFromDb,
  toDeliverySettings,
} from "@/lib/delivery-settings-data";
import { generateOrderNumber } from "@/lib/orders";
import { fetchCustomerByPhone, upsertCustomerOnOrder } from "@/lib/customer-data";
import {
  calcFreeDrinkDiscount,
  FREE_DRINK_POINTS,
  redeemFreeDrinkOnOrder,
} from "@/lib/points-data";
import {
  calcDiscountForPromo,
  fetchPromoByCode,
  incrementPromoUsage,
  toPromoDefinition,
  validatePromoRecord,
} from "@/lib/promo-data";
import { normalizeCode } from "@/lib/promotions";
import { lookupReferrerInDb } from "@/lib/referrer-lookup";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchRestaurantFromDb } from "@/lib/restaurant-data";
import type { DbOrderItem } from "@/types/database";
import type { DbOrderType } from "@/types/database";

type CreateOrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  basePrice: number;
  unitPrice: number;
  options: Record<string, unknown>;
  toppings: unknown[];
  addons: unknown[];
  lineTotal: number;
};

type CreateOrderBody = {
  customerName: string;
  customerPhone: string;
  customerNote?: string;
  orderType?: DbOrderType;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  distanceMeters: number;
  foodTotal: number;
  deliveryFee: number;
  discountTotal: number;
  payableTotal: number;
  paymentMethod: "cash" | "transfer";
  paymentSlipUrl?: string | null;
  promoCode?: string | null;
  referrerCode?: string | null;
  useFreeDrinkReward?: boolean;
  freeDrinkProductId?: string | null;
  items: CreateOrderItem[];
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Supabase" },
      { status: 503 },
    );
  }

  const shop = await fetchRestaurantFromDb();
  if (!shop) {
    return NextResponse.json(
      { error: "โหลดสถานะร้านไม่สำเร็จ" },
      { status: 500 },
    );
  }

  if (!shop.isOpen) {
    return NextResponse.json(
      { error: "ร้านปิดรับออเดอร์อยู่ในขณะนี้" },
      { status: 403 },
    );
  }

  let body: CreateOrderBody;
  try {
    body = (await request.json()) as CreateOrderBody;
  } catch {
    return badRequest("ข้อมูลไม่ถูกต้อง");
  }

  if (
    !body.customerName?.trim() ||
    !body.customerPhone?.trim() ||
    !body.deliveryAddress?.trim() ||
    !Array.isArray(body.items) ||
    body.items.length === 0
  ) {
    return badRequest("กรอกข้อมูลไม่ครบ");
  }

  const customerPhone = normalizePhone(body.customerPhone);
  if (!isValidPhone(customerPhone)) {
    return badRequest("เบอร์โทรไม่ถูกต้อง (ต้อง 10 หลัก ขึ้นต้นด้วย 0)");
  }

  const paymentSlipUrl = body.paymentSlipUrl?.trim() || null;

  if (body.paymentMethod !== "cash" && body.paymentMethod !== "transfer") {
    return badRequest("วิธีชำระเงินไม่ถูกต้อง");
  }

  if (body.paymentMethod === "transfer" && !paymentSlipUrl) {
    return badRequest("กรุณาแนบสลิปโอนเงิน");
  }
  if (body.paymentMethod === "cash" && paymentSlipUrl) {
    return badRequest("ออเดอร์เงินสดไม่ต้องแนบสลิป");
  }

  const orderType: DbOrderType = body.orderType === "pickup" ? "pickup" : "delivery";

  const deliverySettingsResponse = await fetchDeliverySettingsFromDb();
  const deliverySettings = deliverySettingsResponse
    ? toDeliverySettings(deliverySettingsResponse)
    : null;

  if (!deliverySettings) {
    return NextResponse.json(
      { error: "โหลดการตั้งค่าจัดส่งไม่สำเร็จ" },
      { status: 500 },
    );
  }

  let serverDeliveryFee = 0;
  if (orderType === "delivery") {
    if (!isDeliverableFromSettings(body.distanceMeters, deliverySettings)) {
      return badRequest("อยู่นอกเขตจัดส่ง");
    }

    const deliveryFee = calcDeliveryFeeFromSettings(
      body.distanceMeters,
      deliverySettings,
    );
    if (deliveryFee === null) {
      return badRequest("คำนวณค่าส่งไม่ได้");
    }
    serverDeliveryFee = deliveryFee;
  } else if (body.deliveryFee !== 0 || body.distanceMeters !== 0) {
    return badRequest("ออเดอร์รับหน้าร้านต้องไม่มีค่าส่ง");
  }

  const computedFoodTotal = body.items.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );
  if (computedFoodTotal !== body.foodTotal) {
    return badRequest("ยอดอาหารไม่ตรงกับรายการ");
  }

  let discountTotal = 0;
  let promoCode: string | null = null;
  let promoId: string | null = null;

  if (body.promoCode?.trim()) {
    const promo = await fetchPromoByCode(body.promoCode);
    if (!promo) {
      return badRequest("โค้ดโปรโมชั่นไม่ถูกต้อง");
    }

    const validation = validatePromoRecord(promo, { foodTotal: computedFoodTotal });
    if (!validation.ok) {
      return badRequest(validation.error);
    }

    const discounts = calcDiscountForPromo(
      toPromoDefinition(promo),
      computedFoodTotal,
      serverDeliveryFee,
    );
    discountTotal = discounts.totalDiscount;
    promoCode = normalizeCode(promo.code);
    promoId = promo.id;
  }

  let rewardDiscount = 0;
  let rewardCustomerId: string | null = null;

  if (body.useFreeDrinkReward) {
    const rewardCustomer = await fetchCustomerByPhone(customerPhone);
    if (!rewardCustomer || (rewardCustomer.points ?? 0) < FREE_DRINK_POINTS) {
      return badRequest("คะแนนไม่เพียงพอสำหรับแลกเครื่องดื่มฟรี");
    }

    const targetItem =
      body.items.find((item) => item.productId === body.freeDrinkProductId) ??
      body.items[0];

    if (!targetItem) {
      return badRequest("ไม่พบรายการสำหรับแลกสิทธิ์");
    }

    rewardDiscount = calcFreeDrinkDiscount(
      targetItem.basePrice,
      targetItem.quantity,
    );
    rewardCustomerId = rewardCustomer.id;
  }

  const deliveryMinimumSurcharge = calcDeliveryMinimumSurcharge(
    computedFoodTotal,
    orderType,
  );

  const payableTotal = Math.max(
    0,
    computedFoodTotal +
      deliveryMinimumSurcharge +
      serverDeliveryFee -
      discountTotal -
      rewardDiscount,
  );

  if (
    body.deliveryFee !== serverDeliveryFee ||
    body.discountTotal !== discountTotal ||
    body.payableTotal !== payableTotal
  ) {
    return badRequest("ยอดชำระไม่ตรงกับระบบ กรุณาลองใหม่");
  }

  let referrerCode: string | null = null;
  if (body.referrerCode?.trim()) {
    const referrer = await lookupReferrerInDb(body.referrerCode);
    if (!referrer) {
      return badRequest("ไม่พบเบอร์ผู้แนะนำในระบบ");
    }
    referrerCode = referrer.code;
  }

  const supabase = createServerClient();
  const orderNumber = generateOrderNumber();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      restaurant_id: RESTAURANT.id,
      customer_name: body.customerName.trim(),
      customer_phone: customerPhone,
      order_type: orderType,
      customer_note: body.customerNote?.trim() || null,
      delivery_address: body.deliveryAddress.trim(),
      delivery_latitude: body.deliveryLatitude,
      delivery_longitude: body.deliveryLongitude,
      distance_meters: body.distanceMeters,
      food_total: computedFoodTotal,
      delivery_fee: serverDeliveryFee,
      discount_total: discountTotal,
      payable_total: payableTotal,
      payment_method: body.paymentMethod,
      payment_slip_url: paymentSlipUrl,
      promo_code: promoCode,
      referrer_code: referrerCode,
      reward_discount: rewardDiscount,
      status: "PENDING",
    })
    .select("id, order_number, status, created_at")
    .single();

  if (orderError || !order) {
    console.error("create order error:", orderError);

    if (
      orderError?.code === "PGRST204" &&
      orderError.message.includes("payment_slip_url")
    ) {
      return NextResponse.json(
        {
          error:
            "ฐานข้อมูลยังไม่มีคอลัมน์ payment_slip_url — รัน migration 006_payment_slip.sql ใน Supabase SQL Editor หรือ npm run db:migrate",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "บันทึกออเดอร์ไม่สำเร็จ" },
      { status: 500 },
    );
  }

  const orderItems: Omit<DbOrderItem, "id" | "created_at">[] = body.items.map(
    (item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      options: item.options,
      toppings: item.toppings,
      addons: item.addons,
      line_total: item.lineTotal,
    }),
  );

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("create order items error:", itemsError);
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json(
      { error: "บันทึกรายการออเดอร์ไม่สำเร็จ" },
      { status: 500 },
    );
  }

  if (promoId) {
    const incremented = await incrementPromoUsage(promoId);
    if (!incremented) {
      console.warn("promo usage increment failed for", promoId);
    }
  }

  await upsertCustomerOnOrder({
    phone: customerPhone,
    name: body.customerName.trim(),
    createdAt: order.created_at,
  });

  if (rewardCustomerId && rewardDiscount > 0) {
    try {
      await redeemFreeDrinkOnOrder({
        customerId: rewardCustomerId,
        orderId: order.id,
      });
    } catch (error) {
      console.error("redeem on order error:", error);
      await supabase.from("order_items").delete().eq("order_id", order.id);
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "แลกสิทธิ์ไม่สำเร็จ",
        },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    createdAt: order.created_at,
  });
}
