import { pgTable, uuid, text, timestamp, index, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const savedAddresses = pgTable(
  "saved_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** "c:<companyId>" (shared by a company's members) or "p:<phone>" (personal) — see addressOwner(). */
    owner: text("owner").notNull(),
    label: text("label").notNull(),
    address: text("address").notNull(),
    details: text("details"),
    lat: real("lat"),
    lng: real("lng"),
    /** filled in by itself on the order form (one per list) */
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("saved_addresses_owner_idx").on(t.owner)],
);

export const selectSavedAddressSchema = createSelectSchema(savedAddresses);
export const insertSavedAddressSchema = createInsertSchema(savedAddresses);
export const updateSavedAddressSchema = createUpdateSchema(savedAddresses);
