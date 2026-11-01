/** Runs schema migrations (migrations/*.sql, excluding *seed*) in order.
 *  Usage: npm run db:migrate   (requires DATABASE_URL). */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1, prepare: false });
  const dir = join(process.cwd(), "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && !f.includes("seed"))
    .sort();
  for (const f of files) {
    const content = readFileSync(join(dir, f), "utf8");
    process.stdout.write(`Applying ${f} ... `);
    await sql.unsafe(content).simple();
    process.stdout.write("done\n");
  }
  await sql.end();
  console.log("Migrations complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
