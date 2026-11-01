/** Loads seed data (migrations/0002_seed.sql). Usage: npm run db:seed. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1, prepare: false });
  const content = readFileSync(join(process.cwd(), "migrations", "0002_seed.sql"), "utf8");
  process.stdout.write("Seeding ... ");
  await sql.unsafe(content).simple();
  process.stdout.write("done\n");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
