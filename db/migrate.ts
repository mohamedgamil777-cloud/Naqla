/**
 * The single migration system. Applies db/migrations/*.sql in order, each in its own transaction,
 * and records it in schema_migrations (name + checksum) so re-running is safe.
 *
 *   npm run db:migrate               apply pending migrations          (requires DATABASE_URL)
 *   npm run db:migrate -- --status   list applied / pending, change nothing
 *   npm run db:migrate -- --baseline record every file as applied WITHOUT running it — only for a
 *                                    database that was set up before tracking existed
 *
 * History is forward-only: editing an applied file is refused (checksum mismatch) — add a new file.
 * Seeds live in db/seeds/ and are never run by this script.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const DIR = join(process.cwd(), "db", "migrations");

/** Line endings are normalised so a Windows (CRLF) checkout hashes like the repository (LF). */
export function checksum(content: string): string {
  return createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
}

export function migrationFiles(dir = DIR): { name: string; sql: string; checksum: string }[] {
  return readdirSync(dir)
    .filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(dir, name), "utf8");
      return { name, sql, checksum: checksum(sql) };
    });
}

export type MigrateMode = "apply" | "status" | "baseline";

/** Apply (or list / baseline) the tracked migrations on one database. */
export async function runMigrations(
  url: string,
  mode: MigrateMode = "apply",
  log: (line: string) => void = console.log,
) {
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

  try {
    await sql`CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name       text PRIMARY KEY,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`;
    const applied = new Map(
      (
        await sql<{ name: string; checksum: string }[]>`SELECT name, checksum FROM public.schema_migrations`
      ).map((r) => [r.name, r.checksum]),
    );
    const files = migrationFiles();

    const changed = files.filter((f) => applied.has(f.name) && applied.get(f.name) !== f.checksum);
    if (changed.length) {
      throw new Error(
        `Applied migrations were edited (forward-only history — add a new file instead): ${changed.map((f) => f.name).join(", ")}`,
      );
    }
    const pending = files.filter((f) => !applied.has(f.name));

    if (mode === "status") {
      for (const f of files) log(`${applied.has(f.name) ? "applied" : "PENDING"}  ${f.name}`);
      return;
    }
    if (!pending.length) {
      log("Database is up to date.");
      return;
    }
    for (const f of pending) {
      await sql.begin(async (tx) => {
        if (mode === "apply") await tx.unsafe(f.sql);
        await tx`INSERT INTO public.schema_migrations (name, checksum) VALUES (${f.name}, ${f.checksum})`;
      });
      log(`${mode === "baseline" ? "Recorded" : "Applied"} ${f.name}`);
    }
    log(mode === "baseline" ? "Baseline recorded." : "Migrations complete.");
  } finally {
    await sql.end();
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const mode: MigrateMode = process.argv.includes("--baseline")
    ? "baseline"
    : process.argv.includes("--status")
      ? "status"
      : "apply";
  await runMigrations(url, mode);
}

if (process.argv[1] && /migrate\.ts$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
