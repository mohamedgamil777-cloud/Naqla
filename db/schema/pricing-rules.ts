import { pgTable, uuid, text, integer, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

import { anyId, timestamps } from "./columns";

export const pricingRules = pgTable("pricing_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  scope: text("scope", { enum: ["global", "category", "vehicle"] }).notNull(),
  /** Null for global; category id or vehicle id for the others. */
  targetId: uuid("target_id"),
  /** [{hours,price}] in piastres. */
  tiers: jsonb("tiers").notNull().default([]),
  dailyPrice: integer("daily_price").notNull().default(0),
  extraHourPrice: integer("extra_hour_price").notNull().default(0),
  weekendMultiplier: real("weekend_multiplier").notNull().default(1),
  peakMultiplier: real("peak_multiplier").notNull().default(1),
  peakWindow: jsonb("peak_window"), // {from,to} | null
  holidayMultiplier: real("holiday_multiplier").notNull().default(1),
  holidayDates: jsonb("holiday_dates").notNull().default([]),
  driverFeePerHour: integer("driver_fee_per_hour").notNull().default(0),
  loaderFeePerPerson: integer("loader_fee_per_person").notNull().default(0),
  perKmPrice: integer("per_km_price").notNull().default(0),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  deposit: integer("deposit").notNull().default(0),
  minHours: integer("min_hours").notNull().default(2),
  maxHours: integer("max_hours").notNull().default(336),
  bufferMinutes: integer("buffer_minutes").notNull().default(30),
  ...timestamps,
});

const tierSchema = z.object({ hours: z.number(), price: z.number() });

const pricingRuleJson = {
  id: anyId,
  targetId: anyId,
  tiers: z.array(tierSchema),
  peakWindow: z.object({ from: z.number(), to: z.number() }).nullable(),
  holidayDates: z.array(z.string()),
};

export const selectPricingRuleSchema = createSelectSchema(pricingRules, pricingRuleJson);
export const insertPricingRuleSchema = createInsertSchema(pricingRules, pricingRuleJson);
export const updatePricingRuleSchema = createUpdateSchema(pricingRules, pricingRuleJson);
