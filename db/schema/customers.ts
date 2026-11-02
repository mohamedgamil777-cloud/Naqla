import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { timestamps } from "./columns";
import { users } from "./users";

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nationalId: text("national_id"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  ...timestamps,
});

export const selectCustomerSchema = createSelectSchema(customers);
export const insertCustomerSchema = createInsertSchema(customers);
export const updateCustomerSchema = createUpdateSchema(customers);
