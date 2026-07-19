import { RiderDeliveryBoard } from "@/components/rider/rider-delivery-board";
import { isRiderAuthenticated } from "@/lib/rider-session";

export default async function RiderMapPage() {
  return (
    <RiderDeliveryBoard
      initiallyAuthenticated={await isRiderAuthenticated()}
      initialView="map"
    />
  );
}
