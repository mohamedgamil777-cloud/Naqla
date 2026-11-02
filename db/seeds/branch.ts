import { ne } from "drizzle-orm";
import { db } from "@/db/client";
import { branches } from "@/db/schema";

export const SAMPLE_BRANCH_ID = "11111111-1111-4111-8111-111111111111";

/** The sample branch becomes the active one; the placeholder from migration 0017 steps aside. */
export async function seedBranch() {
  await db.update(branches).set({ active: false }).where(ne(branches.id, SAMPLE_BRANCH_ID));
  const inserted = await db
    .insert(branches)
    .values({
      id: SAMPLE_BRANCH_ID,
      name: "فرع أكتوبر",
      address: "٦ أكتوبر، الجيزة",
      lat: 29.9668,
      lng: 30.9476,
      workingHours: { open: 8, close: 22 },
      active: true,
    })
    .onConflictDoUpdate({ target: branches.id, set: { active: true } })
    .returning({ id: branches.id });
  console.log(inserted.length ? "✅ Branch: فرع أكتوبر (active)" : "⚠️ Skipped: branch");
}
