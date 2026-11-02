import { ensureBootstrapAdmin } from "@/services/bootstrap";

/**
 * The SEED_ADMIN_* super-admin (same rules as the login-time bootstrap: never overwrites an existing
 * password). Runs first, so sample staff can never take its phone with a different password.
 */
export async function seedAdmin() {
  const r = await ensureBootstrapAdmin();
  if (r.status === "refused") throw new Error(`SEED_ADMIN not created: ${r.reason}`);
  if (r.status === "skipped")
    console.log("⚠️ Skipped: set SEED_ADMIN_PHONE and SEED_ADMIN_PASSWORD to create it");
  else if (r.status === "exists")
    console.log("⚠️ Skipped (Already Exists): SEED_ADMIN account — its password was NOT changed");
  else console.log(`✅ SEED_ADMIN account: ${r.status}`);
}
