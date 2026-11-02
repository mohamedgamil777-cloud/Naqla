import { pgTable, uuid, text, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import { timestamps } from "./columns";

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  lat: real("lat"),
  lng: real("lng"),
  /** Working hours per weekday: { "0": {open,close}, ... } Cairo hours. */
  workingHours: jsonb("working_hours").notNull().default({}),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

const branchJson = {
  workingHours: z.object({ open: z.number().optional(), close: z.number().optional() }).passthrough(),
};

export const selectBranchSchema = createSelectSchema(branches, branchJson);
export const insertBranchSchema = createInsertSchema(branches, branchJson);
export const updateBranchSchema = createUpdateSchema(branches, branchJson);
