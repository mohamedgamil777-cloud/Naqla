/**
 * Bootstrap admin: guarantees a super-admin exists after deploys, so the team is never locked out.
 * Reads SEED_ADMIN_PHONE / SEED_ADMIN_PASSWORD (/ SEED_ADMIN_NAME) from the server environment —
 * credentials never live in the repository. Runs at server start (instrumentation.ts) and from
 * `npm run db:seed:admin`. Idempotent and conservative:
 *  - no account for that phone → create it as super_admin with that password
 *  - account exists WITHOUT a password → set the password and make it super_admin
 *  - account exists WITH a password → leave it alone (never overwrites; a customer who already chose
 *    a password is never promoted, so nobody can claim the owner's number and become admin)
 */
import { repo } from "@/db/repo";
import { getEnv } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { passwordProblem } from "@/lib/password-policy";
import { isAdminRole } from "@/lib/permissions";
import { toE164 } from "@/lib/phone";

export type BootstrapResult =
  | { status: "skipped" }
  | { status: "created" | "password-set" | "exists" }
  | { status: "refused"; reason: string };

export async function ensureBootstrapAdmin(): Promise<BootstrapResult> {
  const { SEED_ADMIN_PHONE, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME } = getEnv();
  if (!SEED_ADMIN_PHONE || !SEED_ADMIN_PASSWORD) return { status: "skipped" };

  let phone: string;
  try {
    phone = toE164(SEED_ADMIN_PHONE);
  } catch {
    return { status: "refused", reason: "SEED_ADMIN_PHONE is not a valid Egyptian mobile number" };
  }
  const problem = passwordProblem(SEED_ADMIN_PASSWORD, "super_admin");
  if (problem) return { status: "refused", reason: "SEED_ADMIN_PASSWORD is too weak (8+ characters, not a common password)" };

  const acct = await repo.getLoginAccount(phone);
  if (!acct) {
    const res = await repo.createUserWithPassword({
      phone, name: SEED_ADMIN_NAME ?? "المدير العام", role: "super_admin",
      passwordHash: await hashPassword(SEED_ADMIN_PASSWORD), verified: true,
    });
    return res.created ? { status: "created" } : { status: "exists" }; // another instance created it first
  }
  if (acct.passwordHash) {
    return isAdminRole(acct.role)
      ? { status: "exists" }
      : { status: "refused", reason: "that phone already has a non-admin account with its own password — not promoted" };
  }
  await repo.setPassword(acct.id, await hashPassword(SEED_ADMIN_PASSWORD));
  if (acct.role !== "super_admin") await repo.setAccountRole(acct.id, "super_admin");
  await repo.setPhoneVerified(acct.id, true);
  return { status: "password-set" };
}

/** Startup wrapper: logs the outcome (never the phone/password), never crashes the server. */
export async function runBootstrapAdmin(): Promise<void> {
  try {
    const r = await ensureBootstrapAdmin();
    if (r.status === "refused") console.error(`[bootstrap] admin not created: ${r.reason}`);
    else if (r.status !== "skipped") console.info(`[bootstrap] admin: ${r.status}`);
  } catch (e) {
    console.error("[bootstrap] admin check failed:", e instanceof Error ? e.message : e);
  }
}
