import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { companies } from "./companies";

export const companyMembers = pgTable(
  "company_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    /** Login phone, not a users FK: an owner adds a member before that person has an account. */
    phone: text("phone").notNull(),
    name: text("name"),
    role: text("role", { enum: ["owner", "member"] })
      .notNull()
      .default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("company_members_phone_uq").on(t.phone),
    index("company_members_company_idx").on(t.companyId),
  ],
);

export const selectCompanyMemberSchema = createSelectSchema(companyMembers);
export const insertCompanyMemberSchema = createInsertSchema(companyMembers);
export const updateCompanyMemberSchema = createUpdateSchema(companyMembers);
