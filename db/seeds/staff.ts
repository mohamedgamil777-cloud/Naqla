import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";

/** Sample logins for local development only. The passwords are public (db/README.md). */
export const DEV_STAFF = [
  { name: "أحمد المدير", phone: "+201000000001", role: "super_admin", password: "dev-admin-1234" },
  { name: "منى الحجوزات", phone: "+201000000002", role: "agent", password: "dev-agent-1234" },
  { name: "سعيد السائق", phone: "+201000000003", role: "driver", password: "dev-driver-1234" },
] as const;

/** A phone that already has an account (e.g. the SEED_ADMIN_* one) is left exactly as it is. */
export async function seedDevStaff() {
  for (const s of DEV_STAFF) {
    const now = new Date();
    const inserted = await db
      .insert(users)
      .values({
        phone: s.phone,
        name: s.name,
        role: s.role,
        passwordHash: await hashPassword(s.password),
        passwordSetAt: now,
        phoneVerifiedAt: now,
      })
      .onConflictDoNothing({ target: users.phone })
      .returning({ id: users.id });
    console.log(
      inserted.length
        ? `✅ Inserted: ${s.role} ${s.name} (${s.phone} / ${s.password})`
        : `⚠️ Skipped (Already Exists): ${s.phone} — kept its own password`,
    );
  }
}
