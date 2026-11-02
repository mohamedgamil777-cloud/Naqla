import { db } from "@/db/client";
import { promoCodes, settings } from "@/db/schema";

/** Business rules and texts; existing keys (edited from admin) are left alone. */
export async function seedSettings() {
  const rows = [
    {
      key: "business",
      value: {
        bufferMinutes: 30,
        minHours: 2,
        maxHours: 336,
        advanceDays: 30,
        nowLeadHours: 1,
        freeCancelHours: 6,
        vatRate: 0,
        currency: "EGP",
        timezone: "Africa/Cairo",
        durationOptions: [2, 4, 6, 8, 12, 24],
      },
    },
    { key: "company", value: { name: "نقلة", phone: "+201000000000", whatsapp: "+201000000000" } },
    {
      key: "terms",
      value: {
        ar: "يجب تقديم بطاقة رقم قومي ورخصة قيادة سارية عند الاستلام. التأمين مسترد بعد فحص العربية.",
      },
    },
    { key: "cancellation", value: { ar: "الإلغاء مجاني حتى ٦ ساعات قبل ميعاد الاستلام." } },
  ];
  for (const row of rows) {
    const inserted = await db
      .insert(settings)
      .values(row)
      .onConflictDoNothing()
      .returning({ key: settings.key });
    console.log(
      inserted.length ? `✅ Inserted: setting ${row.key}` : `⚠️ Skipped (Already Exists): setting ${row.key}`,
    );
  }
}

/** A welcome code: 50 EGP off orders of 200 EGP or more. */
export async function seedPromoCodes() {
  const inserted = await db
    .insert(promoCodes)
    .values({
      code: "ترحيب",
      type: "fixed",
      value: 5000,
      scope: "all",
      minValue: 20000,
      maxUses: 1000,
      active: true,
    })
    .onConflictDoNothing()
    .returning({ id: promoCodes.id });
  console.log(
    inserted.length ? "✅ Inserted: promo code ترحيب" : "⚠️ Skipped (Already Exists): promo code ترحيب",
  );
}
