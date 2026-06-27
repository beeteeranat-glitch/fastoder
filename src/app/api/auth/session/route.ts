import { NextResponse } from "next/server";
import { formatPhoneForDisplay } from "@/lib/phone";
import {
  getAuthenticatedCustomer,
  clearCustomerSession,
} from "@/lib/customer-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ authenticated: false });
  }

  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    customer: {
      id: customer.id,
      phone: customer.phone,
      phoneDisplay: formatPhoneForDisplay(customer.phone),
      name: customer.name,
      defaultAddress: customer.default_address ?? null,
      points: customer.points ?? 0,
      orderCount: customer.order_count,
      totalSpent: customer.total_spent,
    },
  });
}

export async function DELETE() {
  await clearCustomerSession();
  return NextResponse.json({ ok: true });
}
