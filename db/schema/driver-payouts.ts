import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const driverPayouts = pgTable(
  "driver_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    method: text("method", { enum: ["cash", "bank", "wallet"] })
      .notNull()
      .default("cash"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("driver_payouts_driver_idx").on(t.driverId)],
);

export const selectDriverPayoutSchema = createSelectSchema(driverPayouts);
export const insertDriverPayoutSchema = createInsertSchema(driverPayouts);
export const updateDriverPayoutSchema = createUpdateSchema(driverPayouts);
