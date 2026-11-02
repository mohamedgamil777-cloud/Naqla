/**
 * Wipes the local database and rebuilds it from db/migrations — every table, row and extension in the
 * public schema is dropped first. Then `npm run db:seed` fills it with sample data.
 *
 *   npm run db:reset    drop everything, re-apply all migrations
 *   npm run db:fresh    db:reset + db:seed
 *
 * Like the seeds, this refuses any database that is not on this machine.
 */
import postgres from "postgres";
import { runMigrations } from "./migrate";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { hostname, pathname } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname))
    throw new Error(`Refusing to reset ${hostname}: db:reset is for a local database only`);

  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    process.stdout.write(`Wiping ${pathname.slice(1)} ... `);
    await sql.unsafe(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      ALTER SCHEMA public OWNER TO pg_database_owner;
      GRANT USAGE ON SCHEMA public TO PUBLIC;
    `);
    process.stdout.write("done\n");
  } finally {
    await sql.end();
  }

  await runMigrations(url);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
