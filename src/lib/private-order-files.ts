import { createServerClient } from "@/lib/supabase/server";

export const PRIVATE_ORDER_FILES_BUCKET = "order-documents";
const PRIVATE_PATH_PREFIXES = ["slips/", "delivery-proofs/"];
const SIGNED_URL_TTL_SECONDS = 60 * 60;

type OrderMedia = {
  payment_slip_url?: string | null;
  delivery_proof_url?: string | null;
};

export function isPrivateOrderFilePath(value: string | null | undefined) {
  return Boolean(
    value && PRIVATE_PATH_PREFIXES.some((prefix) => value.startsWith(prefix)),
  );
}

export async function createPrivateOrderFileUrl(path: string) {
  if (!isPrivateOrderFilePath(path)) return path;

  const { data, error } = await createServerClient()
    .storage
    .from(PRIVATE_ORDER_FILES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("create signed order document URL error:", error);
    return null;
  }

  return data.signedUrl;
}

export async function withSignedOrderMedia<T extends OrderMedia>(order: T) {
  const [paymentSlipUrl, deliveryProofUrl] = await Promise.all([
    order.payment_slip_url
      ? createPrivateOrderFileUrl(order.payment_slip_url)
      : Promise.resolve(order.payment_slip_url),
    order.delivery_proof_url
      ? createPrivateOrderFileUrl(order.delivery_proof_url)
      : Promise.resolve(order.delivery_proof_url),
  ]);

  return {
    ...order,
    payment_slip_url: paymentSlipUrl,
    delivery_proof_url: deliveryProofUrl,
  } as T;
}
