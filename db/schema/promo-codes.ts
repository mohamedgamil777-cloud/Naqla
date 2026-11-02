import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { timestamps } from "./columns";

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    type: text("type", { enum: ["pct", "fixed"] }).notNull(),
    value: integer("value").notNull(), // pct: 0-100, fixed: piastres
    scope: text("scope", { enum: ["all", "category", "vehicle"] })
      .notNull()
      .default("all"),
    targetId: uuid("target_id"),
    minValue: integer("min_value").notNull().default(0),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
    maxUses: integer("max_uses"),
    used: integer("used").notNull().default(0),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("promo_code_uq").on(t.code)],
);

export const selectPromoCodeSchema = createSelectSchema(promoCodes);
export const insertPromoCodeSchema = createInsertSchema(promoCodes);
export const updatePromoCodeSchema = createUpdateSchema(promoCodes);
