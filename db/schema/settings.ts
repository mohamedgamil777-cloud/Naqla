import { pgTable, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import { timestamps } from "./columns";

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  ...timestamps,
});

const settingJson = { value: z.unknown() };

export const selectSettingSchema = createSelectSchema(settings, settingJson);
export const insertSettingSchema = createInsertSchema(settings, settingJson);
export const updateSettingSchema = createUpdateSchema(settings, settingJson);
