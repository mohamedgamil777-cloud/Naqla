import { timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

/** created_at / updated_at (updated_at is kept current by the set_updated_at() trigger). */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/**
 * Row ids as read back from our own database. Zod 4's `uuid()` only accepts RFC 9562 ids, but the
 * production rows were seeded with ids like 11111111-1111-1111-1111-111111111111 that Postgres stores
 * happily and Zod rejects, which made every page that parses a branch, order or booking return 500
 * (the order page /estimate, 2026-11-05). `guid()` accepts any 8-4-4-4-12 hex id. Use as a drizzle-zod
 * callback refinement (`{ id: anyId }`) so nullability is still added from the column.
 */
export const anyId = () => z.guid();
