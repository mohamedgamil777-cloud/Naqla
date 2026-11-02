/**
 * Seeds the database. Every step is idempotent: rows that already exist are skipped, so re-running is safe.
 *
 *   npm run db:seed          SEED_ADMIN_* super-admin + sample data (local databases only)
 *   npm run db:seed:admin    only the SEED_ADMIN_* super-admin (any database — production uses this)
 *
 * The admin is seeded first so its configured password always wins over the sample staff logins.
 */
import { closeDb } from "./client";
import { requireLocalDatabase } from "./local-only";
import { seedAdmin } from "./seeds/admin";
import { seedBookings } from "./seeds/bookings";
import { seedBranch } from "./seeds/branch";
import { seedCategories, seedPricingRules, seedVehicles } from "./seeds/fleet";
import { seedPromoCodes, seedSettings } from "./seeds/settings";
import { seedDevStaff } from "./seeds/staff";

const adminOnly = process.argv.includes("--admin");

async function main() {
  if (!adminOnly) requireLocalDatabase("seed sample data");

  await seedAdmin();
  console.log("🎉 Admin Seeding complete!");
  if (adminOnly) return;

  await seedBranch();
  console.log("🎉 Branch Seeding complete!");
  await seedCategories();
  await seedVehicles();
  await seedPricingRules();
  console.log("🎉 Fleet & Pricing Seeding complete!");
  await seedSettings();
  await seedPromoCodes();
  console.log("🎉 Settings & Promo Codes Seeding complete!");
  await seedBookings();
  console.log("🎉 Bookings Seeding complete!");
  await seedDevStaff();
  console.log("🎉 Staff Seeding complete!");
  console.log("🎉 All Seedings are complete!");
}

main()
  .catch((err) => {
    console.error("❌ Error during seeding:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closeDb);
