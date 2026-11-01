/**
 * Create the first super-admin from the environment (same rules as the startup bootstrap).
 *   SEED_ADMIN_PHONE=01xxxxxxxxx SEED_ADMIN_PASSWORD='…' DATABASE_URL='…' npm run db:seed:admin
 * Never overwrites an existing password. Credentials come from the environment, never from the repo.
 */
import { ensureBootstrapAdmin } from "@/services/bootstrap";

ensureBootstrapAdmin()
  .then((r) => {
    console.log(r.status === "refused" ? `Not created: ${r.reason}` : r.status === "skipped" ? "Set SEED_ADMIN_PHONE and SEED_ADMIN_PASSWORD first." : `Admin: ${r.status}`);
    process.exit(r.status === "refused" ? 1 : 0);
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
