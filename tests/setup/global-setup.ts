/**
 * Tests run against a real Postgres database (there is no in-memory store). DATABASE_URL comes from
 * .env.test.local (see db/README.md) and must name a database ending in "_test": every run migrates
 * it and then empties every table.
 */
import postgres from "postgres";
import { runMigrations } from "@/db/migrate";

export default async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Tests need DATABASE_URL (a local *_test database) — see db/README.md");
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to run tests on "${name}": the test database name must end in "_test"`);
  }

  await runMigrations(url, "apply", () => {});
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    const tables = await sql<{ name: string }[]>`
      SELECT quote_ident(tablename) AS name FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> 'schema_migrations'`;
    if (tables.length)
      await sql.unsafe(`TRUNCATE ${tables.map((t) => t.name).join(", ")} RESTART IDENTITY CASCADE`);
  } finally {
    await sql.end();
  }
}
