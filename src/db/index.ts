/** Postgres/Drizzle client. Null when DATABASE_URL is not configured (dev
 * fallback to the in-memory store then kicks in). */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

let _sql: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (url) {
  _sql = postgres(url, { max: 5, prepare: false });
  _db = drizzle(_sql, { schema });
}

export const hasDb = Boolean(url);
export const sql = _sql;
export const db = _db;
export { schema };
