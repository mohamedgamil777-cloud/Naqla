import type { z } from "zod";
import type { Quote } from "@/engines/pricing";
import type { selectDeliveryOrderSchema } from "@/db/schema";

type OrderRow = z.infer<typeof selectDeliveryOrderSchema>;

/** en_route = driving to pickup · arrived = at pickup (loading), then on to drop-off */
export type DeliveryOrderStatus = OrderRow["status"];
/** cash = pay per trip, account = goes on the company's monthly statement */
export type OrderBilling = OrderRow["billing"];
/** customer = placed on the site · agent = taken by staff on the phone */
export type OrderSource = OrderRow["source"];

export type DeliveryOrderDTO = Omit<OrderRow, "id" | "categoryId" | "priceSnapshot" | "driverFee"> & {
  categoryId: string;
  /** piastres the driver earns for this delivery */
  driverFee: number;
  priceSnapshot: Quote;
  /** joined from the assigned driver's current user row */
  driverName: string | null;
  driverPhone: string | null;
};

export type DeliveryOrderInput = Pick<OrderRow, "categoryId" | "km" | "loaders" | "scheduledAt"> &
  Partial<
    Pick<
      OrderRow,
      | "pickupAddress"
      | "dropoffAddress"
      | "pickupDetails"
      | "dropoffDetails"
      | "cargoType"
      | "notes"
      | "pickupLat"
      | "pickupLng"
      | "dropoffLat"
      | "dropoffLng"
      | "companyId"
      | "billing"
      | "source"
      | "agentName"
    >
  > & {
    categoryId: string;
    contactName: string;
    contactPhone: string;
  };

/** Order lists are always filtered and paginated in the database. */
export interface DeliveryOrderFilter {
  /** one status, "open" (not finished) or "closed" (completed / cancelled) */
  status?: DeliveryOrderStatus | "open" | "closed";
  /** any of these statuses (e.g. a driver's active ones) */
  statuses?: DeliveryOrderStatus[];
  q?: string;
  companyId?: string;
  /** the customer's own orders */
  phone?: string;
  driverId?: string;
  billing?: OrderBilling;
  /** completed orders the customer hasn't rated yet */
  unrated?: boolean;
  /** scheduled in [scheduledFrom, scheduledTo) */
  scheduledFrom?: Date;
  scheduledTo?: Date;
}

/** newest = by creation, latest first · upcoming = by pickup time, soonest first · recent = by pickup, latest first */
export type DeliveryOrderSort = "newest" | "upcoming" | "recent";
