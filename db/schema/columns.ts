import { timestamp } from "drizzle-orm/pg-core";

/** created_at / updated_at (updated_at is kept current by the set_updated_at() trigger). */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};
