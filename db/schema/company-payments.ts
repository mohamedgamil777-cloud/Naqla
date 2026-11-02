import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { companies } from "./companies";

export const companyPayments = pgTable(
  "company_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    method: text("method", { enum: ["cash", "bank", "wallet"] })
      .notNull()
      .default("bank"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("company_payments_company_idx").on(t.companyId)],
);

export const selectCompanyPaymentSchema = createSelectSchema(companyPayments);
export const insertCompanyPaymentSchema = createInsertSchema(companyPayments);
export const updateCompanyPaymentSchema = createUpdateSchema(companyPayments);
