import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Customer login phone (documents can be uploaded before an agent has verified the number). */
    phone: text("phone").notNull(),
    type: text("type", { enum: ["national_id", "license"] }).notNull(),
    url: text("url").notNull(),
    expiry: text("expiry"), // ISO date string
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_phone_idx").on(t.phone)],
);

export const selectDocumentSchema = createSelectSchema(documents);
export const insertDocumentSchema = createInsertSchema(documents);
export const updateDocumentSchema = createUpdateSchema(documents);
