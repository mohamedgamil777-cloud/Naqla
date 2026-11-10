import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/** «للشركات» form: a business asking for a company account; staff call back and open it. */
export const companyRequests = pgTable(
  "company_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyName: text("company_name").notNull(),
    contactName: text("contact_name").notNull(),
    /** E.164 mobile */
    phone: text("phone").notNull(),
    monthlyTrips: text("monthly_trips"),
    note: text("note"),
    status: text("status", { enum: ["new", "handled"] })
      .notNull()
      .default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("company_requests_status_idx").on(t.status, t.createdAt)],
);

export const selectCompanyRequestSchema = createSelectSchema(companyRequests);
export const insertCompanyRequestSchema = createInsertSchema(companyRequests);
