import type { z } from "zod";
import type { Quote } from "@/engines/pricing";
import type { selectBookingSchema, selectPaymentSchema } from "@/db/schema";
import type { paymentInputSchema } from "@/lib/validation/booking";

type BookingRow = z.infer<typeof selectBookingSchema>;
type PaymentRow = z.infer<typeof selectPaymentSchema>;

export type BookingSource = BookingRow["source"];

/** A rental with its vehicle and branch joined (names are read live, never copied). */
export type BookingDTO = Pick<
  BookingRow,
  | "code"
  | "vehicleId"
  | "startsAt"
  | "endsAt"
  | "status"
  | "withDriver"
  | "delivery"
  | "loaders"
  | "driverId"
  | "source"
  | "agentName"
  | "contactName"
  | "contactPhone"
> & {
  vehicleName: string;
  primaryImage: string | null;
  branchName: string;
  hours: number;
  driverName: string | null;
  priceSnapshot: Quote;
};

export type CreateBookingInput = Pick<
  BookingRow,
  "vehicleId" | "startsAt" | "endsAt" | "withDriver" | "delivery" | "loaders"
> & {
  deliveryAddress?: Record<string, unknown> | null;
  promoCode?: string | null;
  contactName: string;
  /** E.164 */
  contactPhone: string;
  customerId?: string | null;
  source?: BookingSource;
  agentName?: string | null;
};

export type BookingError = "CONFLICT" | "VEHICLE_BLOCKED" | "VEHICLE_UNAVAILABLE";

export interface BusinessSettings {
  bufferMinutes: number;
  minHours: number;
  maxHours: number;
  advanceDays: number;
  nowLeadHours: number;
  freeCancelHours: number;
  vatRate: number;
  currency: string;
  timezone: string;
  durationOptions: number[];
}

export type PaymentMethod = PaymentRow["method"];
export type PaymentKind = PaymentRow["kind"];
export type PaymentStatus = PaymentRow["status"];

export type PaymentDTO = Pick<PaymentRow, "id" | "method" | "kind" | "status" | "note" | "createdAt"> & {
  bookingCode: string;
  /** piastres */
  amount: number;
};

export type PaymentInput = z.infer<typeof paymentInputSchema>;
