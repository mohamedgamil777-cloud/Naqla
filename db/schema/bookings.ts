import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import { BOOKING_STATUSES } from "@/lib/constants";
import type { Quote } from "@/engines/pricing";
import { anyId, timestamps } from "./columns";
import { branches } from "./branches";
import { users } from "./users";
import { customers } from "./customers";
import { vehicles } from "./vehicles";

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    customerId: uuid("customer_id").references(() => customers.id),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    /** Staff driver; a driver with trips cannot be deleted (RESTRICT, 0016). */
    driverId: uuid("driver_id").references(() => users.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status", { enum: BOOKING_STATUSES }).notNull().default("pending"),
    withDriver: boolean("with_driver").notNull().default(false),
    delivery: boolean("delivery").notNull().default(false),
    loaders: integer("loaders").notNull().default(0),
    source: text("source", { enum: ["customer", "agent"] })
      .notNull()
      .default("customer"),
    /** Historical: who took a phone booking (the passcode login has no user row to reference). */
    agentName: text("agent_name"),
    deliveryAddress: jsonb("delivery_address"),
    /** Immutable snapshot of the computed quote (piastres). */
    priceSnapshot: jsonb("price_snapshot").notNull(),
    /** Customer contact captured at booking (before/without full profile). */
    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("bookings_code_uq").on(t.code),
    index("bookings_vehicle_idx").on(t.vehicleId),
    index("bookings_customer_idx").on(t.customerId),
    index("bookings_starts_idx").on(t.startsAt),
  ],
);

const bookingJson = {
  id: anyId,
  customerId: anyId,
  vehicleId: anyId,
  branchId: anyId,
  driverId: anyId,
  priceSnapshot: z.custom<Quote>(),
  deliveryAddress: z.record(z.unknown()).nullable(),
};

export const selectBookingSchema = createSelectSchema(bookings, bookingJson);
export const insertBookingSchema = createInsertSchema(bookings, bookingJson);
export const updateBookingSchema = createUpdateSchema(bookings, bookingJson);
