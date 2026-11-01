/** Postgres/Drizzle client. Null when DATABASE_URL is not configured: the in-memory store is used
 * (fine for development/tests; in production lib/env logs it as an error at startup). */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getEnv } from "@/lib/env";

const url = getEnv().DATABASE_URL;

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
