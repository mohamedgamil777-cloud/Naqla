import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { bookings } from "./bookings";

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    method: text("method", { enum: ["cash", "card", "online"] }).notNull(),
    kind: text("kind", { enum: ["rent", "deposit"] }).notNull(),
    amountPiastres: integer("amount_piastres").notNull(),
    status: text("status", { enum: ["paid", "refunded"] })
      .notNull()
      .default("paid"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_booking_idx").on(t.bookingId)],
);

export const selectPaymentSchema = createSelectSchema(payments);
export const insertPaymentSchema = createInsertSchema(payments);
export const updatePaymentSchema = createUpdateSchema(payments);
