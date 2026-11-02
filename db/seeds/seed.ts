/**
 * Local development data: db/seeds/0002_seed.sql (fleet, prices, sample bookings) plus sample staff
 * logins. Usage: npm run db:seed (after npm run db:migrate).
 *
 * The staff passwords are public (db/README.md), so this refuses any database that is not on this
 * machine. Production gets its first admin from SEED_ADMIN_* instead (services/bootstrap.ts).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { hashPassword } from "@/lib/password";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const DEV_STAFF = [
  { name: "أحمد المدير", phone: "+201000000001", role: "super_admin", password: "dev-admin-1234" },
  { name: "منى الحجوزات", phone: "+201000000002", role: "agent", password: "dev-agent-1234" },
  { name: "سعيد السائق", phone: "+201000000003", role: "driver", password: "dev-driver-1234" },
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host))
    throw new Error(`Refusing to seed ${host}: seeds are for a local database only`);

  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    const content = readFileSync(join(process.cwd(), "db", "seeds", "0002_seed.sql"), "utf8");
    process.stdout.write("Seeding sample data ... ");
    await sql.unsafe(content).simple();
    process.stdout.write("done\n");

    process.stdout.write("Seeding staff logins ... ");
    for (const s of DEV_STAFF) {
      const hash = await hashPassword(s.password);
      await sql`
        INSERT INTO users (phone, name, role, password_hash, password_set_at, phone_verified_at)
        VALUES (${s.phone}, ${s.name}, ${s.role}, ${hash}, now(), now())
        ON CONFLICT (phone) DO NOTHING`;
    }
    process.stdout.write("done\n");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
