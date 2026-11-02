import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

// ---------- B2B ----------
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone"),
  taxNumber: text("tax_number"),
  address: text("address"),
  discountPct: integer("discount_pct").notNull().default(0),
  billing: text("billing", { enum: ["cash", "monthly"] })
    .notNull()
    .default("cash"),
  creditLimit: integer("credit_limit").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const selectCompanySchema = createSelectSchema(companies);
export const insertCompanySchema = createInsertSchema(companies);
export const updateCompanySchema = createUpdateSchema(companies);
