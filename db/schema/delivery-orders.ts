import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import type { Quote } from "@/engines/pricing";
import { anyId } from "./columns";
import { companies } from "./companies";
import { users } from "./users";
import { vehicleCategories } from "./vehicle-categories";

export const deliveryOrders = pgTable(
  "delivery_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    categoryId: uuid("category_id").references(() => vehicleCategories.id),
    /** Historical snapshot of the size at order time, kept with price_snapshot (the category can be renamed). */
    sizeName: text("size_name").notNull(),
    sizeCode: text("size_code"),
    pickupAddress: text("pickup_address"),
    dropoffAddress: text("dropoff_address"),
    pickupDetails: text("pickup_details"),
    dropoffDetails: text("dropoff_details"),
    cargoType: text("cargo_type"),
    notes: text("notes"),
    pickupLat: real("pickup_lat"),
    pickupLng: real("pickup_lng"),
    dropoffLat: real("dropoff_lat"),
    dropoffLng: real("dropoff_lng"),
    km: real("km").notNull().default(0),
    loaders: integer("loaders").notNull().default(0),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    /** A driver with orders cannot be deleted (RESTRICT, 0016): driver fees are settled from these rows. */
    driverId: uuid("driver_id").references(() => users.id, { onDelete: "restrict" }),
    status: text("status", {
      enum: ["new", "confirmed", "assigned", "en_route", "arrived", "completed", "cancelled"],
    })
      .notNull()
      .default("new"),
    driverFee: integer("driver_fee").notNull().default(0),
    rating: integer("rating"),
    ratingComment: text("rating_comment"),
    priceSnapshot: jsonb("price_snapshot").notNull(),
    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    billing: text("billing", { enum: ["cash", "account"] })
      .notNull()
      .default("cash"),
    podName: text("pod_name"),
    podPhoto: text("pod_photo"),
    podAt: timestamp("pod_at", { withTimezone: true }),
    source: text("source", { enum: ["customer", "agent"] })
      .notNull()
      .default("customer"),
    /** Historical: who took a phone order (the passcode login has no user row to reference). */
    agentName: text("agent_name"),
    cashReceived: integer("cash_received"),
    cashReceivedAt: timestamp("cash_received_at", { withTimezone: true }),
    /** Historical: who recorded the cash hand-in. */
    cashReceivedBy: text("cash_received_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("delivery_orders_code_uq").on(t.code),
    index("delivery_orders_phone_idx").on(t.contactPhone),
  ],
);

const deliveryOrderJson = {
  id: anyId,
  categoryId: anyId,
  driverId: anyId,
  companyId: anyId,
  priceSnapshot: z.custom<Quote>(),
};

export const selectDeliveryOrderSchema = createSelectSchema(deliveryOrders, deliveryOrderJson);
export const insertDeliveryOrderSchema = createInsertSchema(deliveryOrders, deliveryOrderJson);
export const updateDeliveryOrderSchema = createUpdateSchema(deliveryOrders, deliveryOrderJson);
