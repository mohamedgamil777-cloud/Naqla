import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  amount: integer("amount").notNull(),
  category: text("category").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const selectExpenseSchema = createSelectSchema(expenses);
export const insertExpenseSchema = createInsertSchema(expenses);
export const updateExpenseSchema = createUpdateSchema(expenses);
