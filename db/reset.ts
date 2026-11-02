/**
 * Wipes the local database and rebuilds it from db/migrations — every table, row and extension in the
 * public schema is dropped first. Then `npm run db:seed` fills it again.
 *
 *   npm run db:reset    drop everything, re-apply all migrations
 *   npm run db:fresh    db:reset + db:seed
 *
 * Like the seeds, this refuses any database that is not on this machine.
 */
import postgres from "postgres";
import { requireLocalDatabase } from "./local-only";
import { runMigrations } from "./migrate";

async function main() {
  const url = requireLocalDatabase("reset the database");
  const { pathname } = new URL(url);

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
