/**
 * Postgres/Drizzle client — the only data store (development, tests and production).
 * The connection is opened on first use, never at import: `next build` imports this module without a
 * database, and lib/env refuses to run the server without DATABASE_URL.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { EnvError, getEnv } from "@/lib/env";

export type Database = ReturnType<typeof drizzle<typeof schema>>;
/** A transaction handle; repo functions that take part in a caller's transaction accept `Executor`. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Transaction;

let instance: Database | null = null;

function connect(): Database {
  if (instance) return instance;
  const url = getEnv().DATABASE_URL;
  if (!url) throw new EnvError("DATABASE_URL is required");
  // Serverless: an instance can be frozen while holding a socket, which then dies silently. Without
  // these timeouts the next request reuses the dead connection and hangs (seen live 2026-11-01).
  // Use the Supabase pooler in SESSION mode (port 5432): transaction mode (6543) garbles postgres-js
  // pipelined queries ("invalid frontend message type"). Session mode holds a server slot per
  // connection, so keep the per-instance pool small.
  const client = postgres(url, {
    max: 3,
    prepare: false,
    // Skip the catalog query postgres-js otherwise runs on every new connection (~60 ms in the
    // database plus a round trip, paid on each cold start). It only matters for array columns,
    // and the schema has none.
    fetch_types: false,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 5,
    onnotice: () => {},
  });
  instance = drizzle(client, { schema });
  return instance;
}

/** Lazily connected Drizzle database. */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = connect();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

/** Close the pool (scripts and tests). */
export async function closeDb(): Promise<void> {
  if (!instance) return;
  await instance.$client.end();
  instance = null;
}

export { schema };
