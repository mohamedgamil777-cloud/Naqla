import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bookings } from "@/db/schema";
import { cairoDateISO, cairoDateTime, nextDateISO } from "@/lib/time";
import { SAMPLE_BRANCH_ID } from "./branch";
import { SAMPLE_VEHICLE_IDS } from "./fleet";

/** Two confirmed bookings tomorrow (Cairo time), so the schedule board isn't empty. */
export async function seedBookings() {
  const tomorrow = nextDateISO(cairoDateISO(new Date()));
  const samples = [
    {
      code: "10001",
      vehicleId: SAMPLE_VEHICLE_IDS.pickupDouble,
      startsAt: cairoDateTime(tomorrow, 10),
      endsAt: cairoDateTime(tomorrow, 14),
      withDriver: false,
      delivery: false,
      priceSnapshot: {
        hours: 4,
        subtotal: 80000,
        discount: 0,
        vat: 0,
        total: 80000,
        deposit: 50000,
        currency: "EGP",
        lines: [{ key: "base", labelAr: "سعر العربية", amount: 80000 }],
      },
      contactName: "محمد علي",
      contactPhone: "+201001112233",
    },
    {
      code: "10002",
      vehicleId: SAMPLE_VEHICLE_IDS.vanMedium,
      startsAt: cairoDateTime(tomorrow, 9),
      endsAt: cairoDateTime(tomorrow, 11),
      withDriver: true,
      delivery: true,
      priceSnapshot: {
        hours: 2,
        subtotal: 55000,
        discount: 0,
        vat: 0,
        total: 55000,
        deposit: 50000,
        currency: "EGP",
        lines: [
          { key: "base", labelAr: "سعر العربية", amount: 45000 },
          { key: "driver", labelAr: "السائق", amount: 10000 },
        ],
      },
      contactName: "سارة محمود",
      contactPhone: "+201007778899",
    },
  ];
  for (const b of samples) {
    const existing = await db.query.bookings.findFirst({ where: (bookings) => eq(bookings.code, b.code) });
    if (existing) {
      console.log(`⚠️ Skipped (Already Exists): booking #${b.code}`);
      continue;
    }
    await db.insert(bookings).values({ ...b, branchId: SAMPLE_BRANCH_ID, status: "confirmed" });
    console.log(`✅ Inserted: booking #${b.code}`);
  }
}
