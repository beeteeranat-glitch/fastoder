import { RiderOrdersList } from "@/components/rider/rider-orders-list";
import { isRiderAuthenticated } from "@/lib/rider-session";

type PageProps = { searchParams: Promise<{ from?: string }> };

export default async function RiderPage({ searchParams }: PageProps) {
  const { from } = await searchParams;
  return (
    <RiderOrdersList
      initiallyAuthenticated={await isRiderAuthenticated()}
      returnToAdmin={from === "admin"}
    />
  );
}
